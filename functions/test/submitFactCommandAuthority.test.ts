import { describe, expect, test } from "vitest";
import { SubmitFactCommandCoreError } from "../src/submitFactCommandCore";
import { createSubmitFactCommandHarness } from "./harness/submitFactCommandHarness";

// Setup hoisted mocks
const { mockSet, mockGet, mockRunTransaction, mockWhere, idempotencyState, getSetCallCount, resetSetCallCount } = vi.hoisted(() => {
  const mockSet = vi.fn();
  
  let databaseState: any = {
    'objects/object1': { ownerId: 'test-user' },
    'objects/object-other': { ownerId: 'other-user' },
    'markers/marker1': { ownerId: 'test-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'markers/marker2': { ownerId: 'test-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'markers/marker-other': { ownerId: 'other-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'places/place1': { ownerId: 'test-user' },
    'associations/assoc1': { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] },
    'associations/assoc1_already_detached': { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] },
    'associations/assoc2': { ownerId: 'test-user', operation: 'detach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] }
  };
  let idempotencyState: any = {};
  let setCallCount = 0;
  
  const mockGet = vi.fn().mockImplementation((ref) => {
    if (ref && ref.path && databaseState[ref.path]) {
      return Promise.resolve({ exists: true, data: () => databaseState[ref.path] });
    }
    if (ref && ref.path && idempotencyState[ref.path]) {
      return Promise.resolve({ exists: true, data: () => idempotencyState[ref.path] });
    }
    // Handle mock query
    if (ref && ref._isQuery) {
      if (ref._duplicateMatch) {
         return Promise.resolve({ docs: [{ data: () => ({ operation: "detach" }) }] });
      }
      return Promise.resolve({ docs: [] });
    }
    return Promise.resolve({ exists: false, data: () => null });
  });

  const mockWhere = vi.fn().mockImplementation(function(this: any, field, op, val) {
     let query: any = { _isQuery: true, get: mockGet, _duplicateMatch: this?._duplicateMatch };
     query.where = mockWhere.bind(query);
     if (field === "subjectAssociationId" && val === "assoc1_already_detached") {
        query._duplicateMatch = true;
     }
     return query;
  });

  const mockRunTransaction = vi.fn().mockImplementation(async (callback) => {
    const transaction = {
      get: mockGet,
      set: (ref: any, data: any) => {
         mockSet(ref, data);
         if (ref && ref.path && ref.path.startsWith('users/test-user/factCommands/')) {
           idempotencyState[ref.path] = data;
         } else if (ref && ref.path) {
           databaseState[ref.path] = data;
         }
      }
    };
    return callback(transaction);
  });
  return { mockSet, mockGet, mockRunTransaction, mockWhere, databaseState, idempotencyState, getSetCallCount: () => setCallCount, resetSetCallCount: () => { setCallCount = 0; } };
});

vi.mock('firebase-functions/v2/https', () => {
  return {
    onCall: (handler: any) => handler,
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) { super(message); }
    }
  };
});
const assocRequest = (
  commandId: string,
  operation: string,
  marker = "marker1",
  subjectAssociationId?: string,
  participants?: any[],
) => ({
  commandId,
  factType: "association",
  data: {
    operation,
    ...(subjectAssociationId ? { subjectAssociationId } : {}),
    effectiveAt: "2026-07-12T05:00:00Z",
    provenance: { source: "user_confirmed", confidence: "high" },
    participants: participants || [
      { role: "object", ref: { entityType: "object", id: "object1" } },
      { role: "marker", ref: { entityType: "marker", id: marker } },
    ],
  },
});
vi.mock('firebase-admin/firestore', () => {
  const mockDb = {
    collection: vi.fn().mockImplementation(function(this: any, colName) {
      const nextDb: any = Object.assign({}, mockDb);
      nextDb._colName = colName;
      nextDb._path = this && this._path ? `${this._path}/${colName}` : colName;
      return nextDb;
    }),
    doc: vi.fn().mockImplementation(function(this: any, id) { 
      const parentCol = this && this._colName ? this._colName : "unknown";
      const newPath = this && this._path ? `${this._path}/${id}` : `${parentCol}/${id}`;
      return { 
        id, 
        path: newPath, 
        collection: (colName: string) => {
           const nextDb: any = Object.assign({}, mockDb);
           nextDb._colName = colName;
           nextDb._path = newPath ? `${newPath}/${colName}` : colName;
           return nextDb;
        } 
      }; 
    }),
    get: mockGet,
    runTransaction: mockRunTransaction,
    where: mockWhere
  };
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static now() { return new MockTimestamp(Math.floor(Date.now() / 1000), 0); }
    static fromDate(date: Date) { return new MockTimestamp(Math.floor(date.getTime() / 1000), 0); }
    toDate() { return new Date(this.seconds * 1000); }
  }
}
const factWrites = (h: any) =>
  h.firestore.operationLog.filter(
    (op: any) =>
      op.type === "write" &&
      /^(associations|events|observations|measurements)\//.test(op.path),
  ).length;
const receiptWrites = (h: any) =>
  h.firestore.operationLog.filter(
    (op: any) => op.type === "write" && op.path.includes("/factCommands/"),
  ).length;

describe("submitFactCommand behavioral harness", () => {
  test("isolates state between harness instances", async () => {
    const h1 = createSubmitFactCommandHarness({ initial: baseDocs });
    await h1.submit(owner, eventRequest(uuid(10)));
    const h2 = createSubmitFactCommandHarness({ initial: baseDocs });
    expect(
      h2.firestore.get(`users/${owner}/factCommands/${uuid(10)}`),
    ).toBeUndefined();
    expect(h2.firestore.writesTo("events/")).toHaveLength(0);
  });

  test('Idempotency logic matrix', async () => {
    const cmdId = "123e4567-e89b-42d3-a456-426614174000";
    const payload1 = {
      commandId: cmdId,
      factType: "event",
      data: {
        eventType: "test",
        time: { occurredAt: "2026-07-12T05:00:00Z" },
        provenance: { source: "user_confirmed", confidence: "high" },
        participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }]
      }
    };

    // 1. Initial success
    const res1 = await submitFactCommand({ auth, data: payload1 });
    expect(res1.success).toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(2); // receipt and fact

    mockSet.mockClear();

    // 2. Exact replay -> return same factId, NO write
    const res2 = await submitFactCommand({ auth, data: payload1 });
    expect(res2.factId).toBe(res1.factId);
    expect(mockSet).toHaveBeenCalledTimes(0);

    // 3. Same commandId, different data -> reject
    const payloadDifferentData = JSON.parse(JSON.stringify(payload1));
    payloadDifferentData.data.eventType = "other";
    await expect(submitFactCommand({ auth, data: payloadDifferentData })).rejects.toThrow(/Same commandId received with a different payload/);

    // 4. Same commandId, different factType -> reject
    const payloadDifferentType = { ...payload1, factType: "measurement", data: { measurementType: "test", time: { measuredAt: "2026-07-12T05:00:00Z" }, provenance: { source: "user_confirmed", confidence: "high" }, participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }] } };
    await expect(submitFactCommand({ auth, data: payloadDifferentType })).rejects.toThrow(/Same commandId received with a different factType/);

    // 5. Different owner, same commandId -> successful independent insert
    const otherAuth = { uid: "other-user" };
    const payloadOther = { ...payload1, data: { ...payload1.data, participants: [{ role: "object", ref: { entityType: "object", id: "object-other" } }] } };
    const res3 = await submitFactCommand({ auth: otherAuth, data: payloadOther });
    expect(res3.success).toBe(true);
    expect(res3.factId).not.toBe(res1.factId);
  });

  test.each([
    ["valid attach", assocRequest(uuid(20), "attach"), true, undefined],
    [
      "valid detach",
      assocRequest(uuid(21), "detach", "marker1", "assoc1"),
      true,
      undefined,
    ],
    [
      "valid replace",
      assocRequest(uuid(22), "replace", "marker2", "assoc1"),
      true,
      undefined,
    ],
    [
      "subject missing",
      assocRequest(uuid(23), "detach", "marker1", "missing"),
      false,
      "failed-precondition",
    ],
    [
      "subject foreign",
      assocRequest(uuid(24), "detach", "marker1", "assoc-foreign"),
      false,
      "permission-denied",
    ],
    [
      "subject detach",
      assocRequest(uuid(25), "detach", "marker1", "assoc-detached"),
      false,
      "failed-precondition",
    ],
    [
      "subject replace",
      assocRequest(uuid(26), "detach", "marker1", "assoc-replaced"),
      false,
      "failed-precondition",
    ],
    [
      "object mismatch",
      assocRequest(uuid(27), "detach", "marker1", "assoc1", [
        { role: "object", ref: { entityType: "object", id: "object2" } },
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
      ]),
      false,
      "permission-denied",
    ],
    [
      "detach marker mismatch",
      assocRequest(uuid(28), "detach", "marker2", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace same marker",
      assocRequest(uuid(29), "replace", "marker1", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace marker missing",
      assocRequest(uuid(30), "replace", "missing", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "replace multiple markers",
      assocRequest(uuid(31), "replace", "marker2", "assoc1", [
        { role: "object", ref: { entityType: "object", id: "object1" } },
        { role: "marker", ref: { entityType: "marker", id: "marker2" } },
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
      ]),
      false,
      "failed-precondition",
    ],
    [
      "existing detach",
      assocRequest(uuid(32), "detach", "marker1", "assoc1"),
      false,
      "failed-precondition",
    ],
    [
      "old marker missing",
      assocRequest(uuid(33), "replace", "marker2", "assoc-old-missing"),
      false,
      "failed-precondition",
    ],
    [
      "old marker foreign",
      assocRequest(uuid(34), "replace", "marker2", "assoc-old-foreign"),
      false,
      "permission-denied",
    ],
    [
      "new marker foreign",
      assocRequest(uuid(35), "replace", "marker-other", "assoc1"),
      false,
      "permission-denied",
    ],
    [
      "participant order valid detach",
      assocRequest(uuid(36), "detach", "marker1", "assoc1", [
        { role: "marker", ref: { entityType: "marker", id: "marker1" } },
        { role: "object", ref: { entityType: "object", id: "object1" } },
      ]),
      true,
      undefined,
    ],
    [
      "colon ids",
      assocRequest(uuid(37), "detach", "marker:colon", "assoc:colon", [
        { role: "marker", ref: { entityType: "marker", id: "marker:colon" } },
        { role: "object", ref: { entityType: "object", id: "object:colon" } },
      ]),
      true,
      undefined,
    ],
  ])("association transition matrix: %s", async (_name, request, ok, code) => {
    const initial = { ...baseDocs } as Record<string, unknown>;
    if (!_name.startsWith("existing"))
      delete initial["associations/duplicate-detach"];
    const h = createSubmitFactCommandHarness({ initial });
    if (ok) {
      await h.submit(owner, request);
      expect(factWrites(h)).toBe(1);
      expect(receiptWrites(h)).toBe(1);
    } else {
      expect(await rejectCode(h.submit(owner, request))).toBe(code);
      expect(factWrites(h)).toBe(0);
      expect(receiptWrites(h)).toBe(0);
    }
    h.firestore.assertReadsBeforeWrites();
  });
});
