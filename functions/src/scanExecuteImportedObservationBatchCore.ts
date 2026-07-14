import { HttpsError } from "firebase-functions/v2/https";
import { uuidV5FromCanonicalPayload, APPLICATION_UUID_V5_NAMESPACE } from "./deterministicUuid";
import { v7 as uuidv7 } from "uuid";
import * as admin from "firebase-admin";

export interface ScanExecuteImportedObservationBatchResult {
  mode: "dryRun" | "execute";
  checkedAt: string;
  executedBy: string;
  ownerId: string;
  requested: number;
  checked: number;
  created: number;
  skipped: number;
  conflicts: number;
  errors: number;
  skippedList: any[];
  errorsList: any[];
  createdList?: any[];
  candidatesList?: any[];
  auditReceiptId?: string;
  receiptWriteError?: string;
}

export async function executeImportedObservationBatchCore(
  db: any,
  callerUid: string,
  data: any
): Promise<ScanExecuteImportedObservationBatchResult> {
  // 1. Authentication Check
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Authorization Check (Must be in admins/{uid})
  const adminDoc = await db.collection("admins").doc(callerUid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "You do not have administrative privileges.");
  }

  const { mode, ownerId, identifierKeys, confirmationText } = data || {};

  // 3. Input Validation
  if (mode !== "dryRun" && mode !== "execute") {
    throw new HttpsError("invalid-argument", "mode must be either 'dryRun' or 'execute'.");
  }

  if (!ownerId || typeof ownerId !== "string" || ownerId.length > 128) {
    throw new HttpsError("invalid-argument", "ownerId must be a non-empty string and maximum 128 characters.");
  }

  if (!Array.isArray(identifierKeys) || identifierKeys.length === 0) {
    throw new HttpsError("invalid-argument", "identifierKeys must be a non-empty array of strings.");
  }

  for (const key of identifierKeys) {
    if (!key || typeof key !== "string" || key.length > 128) {
      throw new HttpsError("invalid-argument", "All elements in identifierKeys must be non-empty strings and maximum 128 characters.");
    }
  }

  const uniqueIdentifierKeys = Array.from(new Set(identifierKeys));

  if (mode === "dryRun") {
    if (uniqueIdentifierKeys.length > 20) {
      throw new HttpsError("invalid-argument", "Batch size exceeds the maximum limit of 20 for dryRun.");
    }
  } else {
    if (uniqueIdentifierKeys.length > 5) {
      throw new HttpsError("invalid-argument", "Batch size exceeds the maximum limit of 5 for execute.");
    }
    if (confirmationText !== "CREATE_IMPORTED_OBSERVATIONS") {
      throw new HttpsError("invalid-argument", "confirmationText must be exactly 'CREATE_IMPORTED_OBSERVATIONS' for execute mode.");
    }
  }

  const startedAt = new Date().toISOString();
  const executionId = uuidv7();

  const result: ScanExecuteImportedObservationBatchResult = {
    mode,
    checkedAt: startedAt,
    executedBy: callerUid,
    ownerId,
    requested: uniqueIdentifierKeys.length,
    checked: 0,
    created: 0,
    skipped: 0,
    conflicts: 0,
    errors: 0,
    skippedList: [],
    errorsList: [],
    createdList: [],
    candidatesList: []
  };

  for (const identifierKey of uniqueIdentifierKeys) {
    result.checked++;
    try {
      // Source read boundary: Only read from identifiers, identifierObservations, admins
      const identifierDoc = await db.collection("identifiers").doc(identifierKey).get();
      if (!identifierDoc.exists) {
        result.skippedList.push({ identifierKey, reason: "identifier-missing" });
        result.skipped++;
        continue;
      }

      const identifierData = identifierDoc.data();
      if (identifierData?.identifierKey && identifierData.identifierKey !== identifierKey) {
        result.skippedList.push({ identifierKey, reason: "identifier-key-mismatch" });
        result.skipped++;
        continue;
      }

      if (identifierData?.ownerId !== ownerId) {
        result.skippedList.push({ identifierKey, reason: "owner-id-mismatch" });
        result.skipped++;
        continue;
      }

      if (["retired", "lost", "replaced"].includes(identifierData?.status)) {
        result.skippedList.push({ identifierKey, reason: "unsupported-identifier-status", notes: `Status is ${identifierData?.status}` });
        result.skipped++;
        continue;
      }

      if (!["active", "unassigned"].includes(identifierData?.status)) {
        result.skippedList.push({ identifierKey, reason: "invalid-identifier-status" });
        result.skipped++;
        continue;
      }

      if (
        !identifierData?.identifierKey ||
        !identifierData?.ownerId ||
        !identifierData?.kind ||
        !identifierData?.scheme ||
        !identifierData?.canonicalValue ||
        !identifierData?.status ||
        !identifierData?.createdAt
      ) {
        result.skippedList.push({ identifierKey, reason: "missing-required-fields" });
        result.skipped++;
        continue;
      }

      if (typeof identifierData.createdAt.toMillis !== "function" && !(identifierData.createdAt instanceof Date) && typeof identifierData.createdAt !== "string" && typeof identifierData.createdAt !== "number") {
        result.skippedList.push({ identifierKey, reason: "missing-reliable-timestamp" });
        result.skipped++;
        continue;
      }

      let createdAtMillis: number;
      if (typeof identifierData.createdAt.toMillis === "function") {
        createdAtMillis = identifierData.createdAt.toMillis();
      } else if (identifierData.createdAt instanceof Date) {
        createdAtMillis = identifierData.createdAt.getTime();
      } else if (typeof identifierData.createdAt === "number") {
        createdAtMillis = identifierData.createdAt;
      } else {
        createdAtMillis = Date.parse(identifierData.createdAt);
      }

      if (isNaN(createdAtMillis)) {
        result.skippedList.push({ identifierKey, reason: "invalid-timestamp-value" });
        result.skipped++;
        continue;
      }

      // Check if real (non-imported) observations exist for this identifier to prevent pollution
      const maxObservationsPerIdentifier = 20;
      const obsQueryNew = db.collection("identifierObservations")
        .where("identifierKey", "==", identifierKey)
        .where("ownerId", "==", ownerId)
        .limit(maxObservationsPerIdentifier);
      const obsQueryLegacy = db.collection("identifierObservations")
        .where("identifierKey", "==", identifierKey)
        .where("observerUid", "==", ownerId)
        .limit(maxObservationsPerIdentifier);

      let hasRealObservations = false;
      const existingObservations = new Map<string, any>();

      try {
        const [obsSnapNew, obsSnapLegacy] = await Promise.all([obsQueryNew.get(), obsQueryLegacy.get()]);

        if (obsSnapNew.docs.length === maxObservationsPerIdentifier || obsSnapLegacy.docs.length === maxObservationsPerIdentifier) {
          result.skippedList.push({ identifierKey, reason: "observation-check-limit-hit" });
          result.skipped++;
          continue;
        }

        obsSnapNew.docs.forEach((d: any) => existingObservations.set(d.id, d.data()));
        obsSnapLegacy.docs.forEach((d: any) => existingObservations.set(d.id, d.data()));

        for (const obs of existingObservations.values()) {
          const isImported = obs.source === "import" || obs.observationType === "imported";
          if (!isImported) {
            hasRealObservations = true;
            break;
          }
        }
      } catch (err: any) {
        result.skippedList.push({ identifierKey, reason: "observation-check-failed", notes: err.message });
        result.skipped++;
        continue;
      }

      if (hasRealObservations) {
        result.skippedList.push({ identifierKey, reason: "has-real-observations" });
        result.skipped++;
        continue;
      }

      // 5. Deterministic Identity Generation
      const deterministicPayload = {
        app: "scan.moukaeritai.work",
        idKind: "identifierObservation",
        idPurpose: "imported-baseline-observation",
        schemaVersion: 1,
        migration: "observation-model-migration",
        migrationPhase: "phase-6a",
        baseline: "tag-1.0.0",
        ownerId,
        identifierKey
      };

      const observationId = uuidV5FromCanonicalPayload(deterministicPayload);

      // Check existingObservations or DB check
      if (existingObservations.has(observationId)) {
        result.conflicts++;
        result.skippedList.push({ identifierKey, reason: "deterministic-observation-already-exists" });
        result.skipped++;
        continue;
      }

      const detObsDoc = await db.collection("identifierObservations").doc(observationId).get();
      if (detObsDoc.exists) {
        result.conflicts++;
        result.skippedList.push({ identifierKey, reason: "deterministic-observation-already-exists" });
        result.skipped++;
        continue;
      }

      const metadata: any = {
        migration: {
          name: "observation-model-migration",
          phase: "phase-7a",
          version: "v1",
          baseline: "tag-1.0.0",
          importedFrom: "identifiers",
          sourceIdentifierKey: identifierKey,
          timestampSource: "identifier.createdAt",
          observedAtIsInferred: true,
          deterministicIdNamespace: APPLICATION_UUID_V5_NAMESPACE,
          deterministicIdPayloadSchemaVersion: 1,
          reviewedBy: callerUid
        }
      };

      if (identifierData.status === "active" && identifierData.objectId) {
        metadata.migration.sourceObjectId = identifierData.objectId;
      }

      const proposedObservation: any = {
        observationId,
        identifierKey,
        ownerId,
        observerKind: "system",
        observedAt: new Date(createdAtMillis).toISOString(),
        receivedAt: new Date().toISOString(), // In dryRun this is mock, in execute we can use server timestamp
        createdAt: new Date().toISOString(),
        source: "import",
        observationType: "imported",
        visibility: "private",
        schemaVersion: 1,
        metadata
      };

      if (identifierData.status === "active" && identifierData.objectId) {
        proposedObservation.objectId = identifierData.objectId;
      }

      if (mode === "dryRun") {
        result.candidatesList!.push({
          identifierKey,
          observationId,
          deterministicPayload,
          proposedObservation
        });
      } else {
        // execute mode: write ONLY to identifierObservations. No update or overwrite. Use .create()
        const writePayload = {
          ...proposedObservation,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("identifierObservations").doc(observationId).create(writePayload);
        result.createdList!.push({
          identifierKey,
          observationId
        });
        result.created++;
      }
    } catch (err: any) {
      if (err.code === 6 || err.message?.includes("already exists")) {
        // Firestore ALREADY_EXISTS error
        result.conflicts++;
        result.skippedList.push({ identifierKey, reason: "deterministic-observation-already-exists" });
        result.skipped++;
      } else {
        result.errorsList.push({ identifierKey, code: err.code || "unknown", message: err.message });
        result.errors++;
      }
    }
  }

  // 4. Audit Receipt writing
  if (mode === "execute") {
    result.auditReceiptId = executionId;
    const completedAt = new Date().toISOString();
    const receipt = {
      executionId,
      mode: "execute",
      executedBy: callerUid,
      ownerId,
      requestedIdentifierKeys: uniqueIdentifierKeys,
      requestedCount: uniqueIdentifierKeys.length,
      createdCount: result.created,
      skippedCount: result.skipped,
      conflictCount: result.conflicts,
      errorCount: result.errors,
      startedAt,
      completedAt,
      confirmationVersion: 1
    };

    try {
      await db.collection("importExecutionReceipts").doc(executionId).create(receipt);
    } catch (err: any) {
      console.error("Receipt Write Failure:", err.message);
      result.receiptWriteError = err.message;
    }
  }

  // To match clean schema response:
  if (mode === "dryRun") {
    delete result.createdList;
  } else {
    delete result.candidatesList;
  }

  return result;
}
