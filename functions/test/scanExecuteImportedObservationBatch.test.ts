import { describe, test, expect, beforeEach } from "vitest";
import { executeImportedObservationBatchCore } from "../src/scanExecuteImportedObservationBatchCore";
import { HttpsError } from "firebase-functions/v2/https";

class MockDoc {
  constructor(public id: string, private dataVal: any, private existsVal: boolean) {}
  get exists() { return this.existsVal; }
  data() { return this.dataVal; }
}

class MockCollection {
  public docsMap = new Map<string, any>();
  constructor(public name: string) {}

  doc(id: string) {
    const data = this.docsMap.get(id);
    const self = this;
    return {
      get: async () => new MockDoc(id, data, data !== undefined),
      create: async (payload: any) => {
        if (self.docsMap.has(id)) {
          const err: any = new Error("Document already exists");
          err.code = 6; // ALREADY_EXISTS
          throw err;
        }
        self.docsMap.set(id, payload);
      }
    };
  }

  where(field: string, op: string, val: any) {
    const self = this;
    return {
      where: (f2: string, op2: string, val2: any) => {
        return {
          limit: (n: number) => {
            return {
              get: async () => {
                // Return simple matching docs
                const matchedDocs: any[] = [];
                self.docsMap.forEach((v, k) => {
                  if (v[field] === val && v[f2] === val2) {
                    matchedDocs.push(new MockDoc(k, v, true));
                  }
                });
                return { docs: matchedDocs.slice(0, n) };
              }
            };
          }
        };
      },
      limit: (n: number) => {
        return {
          get: async () => {
            const matchedDocs: any[] = [];
            self.docsMap.forEach((v, k) => {
              if (v[field] === val) {
                matchedDocs.push(new MockDoc(k, v, true));
              }
            });
            return { docs: matchedDocs.slice(0, n) };
          }
        };
      }
    };
  }
}

class MockDb {
  public collections = new Map<string, MockCollection>();
  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name)!;
  }
}

describe("scanExecuteImportedObservationBatch", () => {
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    // Register admin user
    db.collection("admins").docsMap.set("admin123", { role: "admin" });
  });

  test("rejects unauthenticated requests", async () => {
    await expect(
      executeImportedObservationBatchCore(db, "", { mode: "dryRun" })
    ).rejects.toThrowError(/You must be logged in/);
  });

  test("rejects non-admin requests", async () => {
    await expect(
      executeImportedObservationBatchCore(db, "user456", { mode: "dryRun" })
    ).rejects.toThrowError(/You do not have administrative privileges/);
  });

  test("rejects invalid mode", async () => {
    await expect(
      executeImportedObservationBatchCore(db, "admin123", { mode: "invalid", ownerId: "owner1", identifierKeys: ["id1"] })
    ).rejects.toThrowError(/mode must be either 'dryRun' or 'execute'/);
  });

  test("rejects empty ownerId or invalid format", async () => {
    await expect(
      executeImportedObservationBatchCore(db, "admin123", { mode: "dryRun", ownerId: "", identifierKeys: ["id1"] })
    ).rejects.toThrowError(/ownerId must be a non-empty string/);
  });

  test("rejects too large dryRun batch size (> 20)", async () => {
    const identifierKeys = Array.from({ length: 21 }, (_, i) => `id${i}`);
    await expect(
      executeImportedObservationBatchCore(db, "admin123", { mode: "dryRun", ownerId: "owner1", identifierKeys })
    ).rejects.toThrowError(/Batch size exceeds the maximum limit/);
  });

  test("rejects too large execute batch size (> 5)", async () => {
    const identifierKeys = Array.from({ length: 6 }, (_, i) => `id${i}`);
    await expect(
      executeImportedObservationBatchCore(db, "admin123", { mode: "execute", ownerId: "owner1", identifierKeys, confirmationText: "CREATE_IMPORTED_OBSERVATIONS" })
    ).rejects.toThrowError(/Batch size exceeds the maximum limit/);
  });

  test("rejects execute mode without exact confirmation text", async () => {
    await expect(
      executeImportedObservationBatchCore(db, "admin123", { mode: "execute", ownerId: "owner1", identifierKeys: ["id1"], confirmationText: "WRONG_TEXT" })
    ).rejects.toThrowError(/confirmationText must be exactly/);
  });

  test("performs dryRun on valid legacy identifiers correctly", async () => {
    // Seed standard mock legacy identifier in Firestore
    const dummyDate = new Date("2024-01-01T00:00:00.000Z");
    db.collection("identifiers").docsMap.set("id_key_001", {
      identifierKey: "id_key_001",
      ownerId: "owner_001",
      kind: "tag",
      scheme: "nfc",
      canonicalValue: "nfc:001",
      status: "active",
      objectId: "obj_001",
      createdAt: {
        toMillis: () => dummyDate.getTime()
      }
    });

    const result = await executeImportedObservationBatchCore(db, "admin123", {
      mode: "dryRun",
      ownerId: "owner_001",
      identifierKeys: ["id_key_001"]
    });

    expect(result.mode).toBe("dryRun");
    expect(result.requested).toBe(1);
    expect(result.checked).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.conflicts).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.candidatesList).toBeDefined();
    expect(result.candidatesList!.length).toBe(1);
    expect(result.candidatesList![0].identifierKey).toBe("id_key_001");
    expect(result.candidatesList![0].observationId).toBeDefined();
    expect(result.candidatesList![0].proposedObservation.objectId).toBe("obj_001");
  });

  test("skips identifiers missing in DB", async () => {
    const result = await executeImportedObservationBatchCore(db, "admin123", {
      mode: "dryRun",
      ownerId: "owner_001",
      identifierKeys: ["missing_id_key"]
    });

    expect(result.skipped).toBe(1);
    expect(result.skippedList[0].reason).toBe("identifier-missing");
  });

  test("performs execute correctly and persists a durable receipt", async () => {
    const dummyDate = new Date("2024-01-01T00:00:00.000Z");
    db.collection("identifiers").docsMap.set("id_key_001", {
      identifierKey: "id_key_001",
      ownerId: "owner_001",
      kind: "tag",
      scheme: "nfc",
      canonicalValue: "nfc:001",
      status: "active",
      objectId: "obj_001",
      createdAt: {
        toMillis: () => dummyDate.getTime()
      }
    });

    const result = await executeImportedObservationBatchCore(db, "admin123", {
      mode: "execute",
      ownerId: "owner_001",
      identifierKeys: ["id_key_001"],
      confirmationText: "CREATE_IMPORTED_OBSERVATIONS"
    });

    expect(result.mode).toBe("execute");
    expect(result.created).toBe(1);
    expect(result.createdList).toBeDefined();
    expect(result.createdList!.length).toBe(1);
    expect(result.auditReceiptId).toBeDefined();

    // Verify written observation exists in mock DB
    const obsId = result.createdList![0].observationId;
    const writtenObs = db.collection("identifierObservations").docsMap.get(obsId);
    expect(writtenObs).toBeDefined();
    expect(writtenObs.identifierKey).toBe("id_key_001");
    expect(writtenObs.ownerId).toBe("owner_001");
    expect(writtenObs.source).toBe("import");

    // Verify receipt exists in mock DB
    const receiptId = result.auditReceiptId!;
    const receipt = db.collection("importExecutionReceipts").docsMap.get(receiptId);
    expect(receipt).toBeDefined();
    expect(receipt.executionId).toBe(receiptId);
    expect(receipt.createdCount).toBe(1);
    expect(receipt.executedBy).toBe("admin123");
  });

  test("idempotent execution skips already imported observations", async () => {
    const dummyDate = new Date("2024-01-01T00:00:00.000Z");
    db.collection("identifiers").docsMap.set("id_key_001", {
      identifierKey: "id_key_001",
      ownerId: "owner_001",
      kind: "tag",
      scheme: "nfc",
      canonicalValue: "nfc:001",
      status: "active",
      objectId: "obj_001",
      createdAt: {
        toMillis: () => dummyDate.getTime()
      }
    });

    // 1st Execution
    const result1 = await executeImportedObservationBatchCore(db, "admin123", {
      mode: "execute",
      ownerId: "owner_001",
      identifierKeys: ["id_key_001"],
      confirmationText: "CREATE_IMPORTED_OBSERVATIONS"
    });
    expect(result1.created).toBe(1);

    // 2nd Execution
    const result2 = await executeImportedObservationBatchCore(db, "admin123", {
      mode: "execute",
      ownerId: "owner_001",
      identifierKeys: ["id_key_001"],
      confirmationText: "CREATE_IMPORTED_OBSERVATIONS"
    });
    expect(result2.created).toBe(0);
    expect(result2.skipped).toBe(1);
    expect(result2.conflicts).toBe(1);
    expect(result2.skippedList[0].reason).toBe("deterministic-observation-already-exists");
  });
});
