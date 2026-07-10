import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { uuidV5FromCanonicalPayload, APPLICATION_UUID_V5_NAMESPACE, canonicalizeJson } from "./deterministicUuid";
import * as crypto from "crypto";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

export interface ScanExecuteImportedObservationBatchResult {
  mode: "dryRun" | "execute";
  checkedAt: string;
  executedBy: string;
  ownerId: string;
  limits: {
    maxBatchSize: number;
  };
  counts: {
    requested: number;
    checked: number;
    skipped: number;
    conflicts: number;
    errors: number;
    candidates?: number;
    created?: number;
  };
  skipped: any[];
  errors: any[];
  candidates?: any[];
  created?: any[];
}

export const scanExecuteImportedObservationBatch = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const db = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "You do not have administrative privileges.");
  }

  const data = request.data || {};
  const { mode, ownerId, identifierKeys, confirmationText } = data;
  const rawMaxBatchSize = data.maxBatchSize;

  if (mode !== "dryRun" && mode !== "execute") {
    throw new HttpsError("invalid-argument", "mode must be either 'dryRun' or 'execute'.");
  }

  if (!ownerId || typeof ownerId !== "string") {
    throw new HttpsError("invalid-argument", "ownerId must be a non-empty string.");
  }

  if (!Array.isArray(identifierKeys) || identifierKeys.length === 0) {
    throw new HttpsError("invalid-argument", "identifierKeys must be a non-empty array of strings.");
  }

  for (const key of identifierKeys) {
    if (!key || typeof key !== "string") {
      throw new HttpsError("invalid-argument", "All elements in identifierKeys must be non-empty strings.");
    }
  }

  const uniqueIdentifierKeys = Array.from(new Set(identifierKeys));

  let effectiveMaxBatchSize = 20;
  if (mode === "execute") {
    effectiveMaxBatchSize = 5;
    if (confirmationText !== "CREATE_IMPORTED_OBSERVATIONS") {
      throw new HttpsError("invalid-argument", "Execute mode requires explicit confirmationText: 'CREATE_IMPORTED_OBSERVATIONS'.");
    }
    if (uniqueIdentifierKeys.length > effectiveMaxBatchSize) {
      throw new HttpsError("invalid-argument", `Execute mode hard limit is ${effectiveMaxBatchSize}.`);
    }
  } else {
    let maxBatchSize = 20;
    if (rawMaxBatchSize !== undefined) {
      if (typeof rawMaxBatchSize !== "number" || !Number.isInteger(rawMaxBatchSize) || rawMaxBatchSize < 1) {
        throw new HttpsError("invalid-argument", "maxBatchSize must be a positive integer.");
      }
      maxBatchSize = rawMaxBatchSize;
    }
    effectiveMaxBatchSize = Math.min(maxBatchSize, 20);
    if (uniqueIdentifierKeys.length > effectiveMaxBatchSize) {
      throw new HttpsError("invalid-argument", `Batch size exceeds the maximum limit of ${effectiveMaxBatchSize}.`);
    }
  }

  const result: ScanExecuteImportedObservationBatchResult = {
    mode: mode,
    checkedAt: new Date().toISOString(),
    executedBy: request.auth.uid,
    ownerId,
    limits: {
      maxBatchSize: effectiveMaxBatchSize
    },
    counts: {
      requested: uniqueIdentifierKeys.length,
      checked: 0,
      skipped: 0,
      conflicts: 0,
      errors: 0
    },
    skipped: [],
    errors: []
  };

  if (mode === "dryRun") {
    result.counts.candidates = 0;
    result.candidates = [];
  } else {
    result.counts.created = 0;
    result.created = [];
  }

  for (const identifierKey of uniqueIdentifierKeys) {
    result.counts.checked++;
    try {
      const identifierDoc = await db.collection("identifiers").doc(identifierKey).get();
      if (!identifierDoc.exists) {
        result.skipped.push({ identifierKey, reason: "identifier-missing" });
        result.counts.skipped++;
        continue;
      }

      const identifierData = identifierDoc.data();
      if (identifierData?.identifierKey && identifierData.identifierKey !== identifierKey) {
        result.skipped.push({ identifierKey, reason: "identifier-key-mismatch" });
        result.counts.skipped++;
        continue;
      }

      if (identifierData?.ownerId !== ownerId) {
        result.skipped.push({ identifierKey, reason: "owner-id-mismatch" });
        result.counts.skipped++;
        continue;
      }

      if (["retired", "lost", "replaced"].includes(identifierData?.status)) {
        result.skipped.push({ identifierKey, reason: "unsupported-identifier-status", notes: `Status is ${identifierData?.status}` });
        result.counts.skipped++;
        continue;
      }

      if (!["active", "unassigned"].includes(identifierData?.status)) {
        result.skipped.push({ identifierKey, reason: "invalid-identifier-status" });
        result.counts.skipped++;
        continue;
      }

      if (!identifierData?.identifierKey || !identifierData?.ownerId || !identifierData?.kind || !identifierData?.scheme || !identifierData?.canonicalValue || !identifierData?.status || !identifierData?.createdAt) {
        result.skipped.push({ identifierKey, reason: "missing-required-fields" });
        result.counts.skipped++;
        continue;
      }

      // Ensure we have a Firestore Timestamp-like object
      if (!identifierData.createdAt || typeof identifierData.createdAt.toMillis !== "function") {
        result.skipped.push({ identifierKey, reason: "missing-reliable-timestamp" });
        result.counts.skipped++;
        continue;
      }

      const createdAtMillis = identifierData.createdAt.toMillis();

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
      let existingObservations = new Map<string, any>();

      try {
        const [obsSnapNew, obsSnapLegacy] = await Promise.all([obsQueryNew.get(), obsQueryLegacy.get()]);

        if (obsSnapNew.docs.length === maxObservationsPerIdentifier || obsSnapLegacy.docs.length === maxObservationsPerIdentifier) {
           result.skipped.push({ identifierKey, reason: "observation-check-limit-hit" });
           result.counts.skipped++;
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
        result.skipped.push({ identifierKey, reason: "observation-check-failed", notes: err.message });
        result.counts.skipped++;
        continue;
      }

      if (hasRealObservations) {
        result.skipped.push({ identifierKey, reason: "has-real-observations" });
        result.counts.skipped++;
        continue;
      }

      const deterministicPayload = {
        app: "scan.moukaeritai.work",
        idKind: "identifierObservation",
        idPurpose: "imported-baseline-observation",
        schemaVersion: 1,
        migration: "observation-model-migration",
        migrationPhase: "phase-6a",
        baseline: "tag-1.0.0",
        ownerId: ownerId,
        identifierKey: identifierKey
      };

      let observationId;
      try {
        observationId = uuidV5FromCanonicalPayload(deterministicPayload);
      } catch (err: any) {
        result.skipped.push({ identifierKey, reason: "uuid-generation-failed", notes: err.message });
        result.counts.skipped++;
        continue;
      }

      if (existingObservations.has(observationId)) {
        result.counts.conflicts++;
        result.skipped.push({ identifierKey, reason: "deterministic-observation-already-exists" });
        result.counts.skipped++;
        continue;
      }

      try {
        const detObsDoc = await db.collection("identifierObservations").doc(observationId).get();
        if (detObsDoc.exists) {
          result.counts.conflicts++;
          result.skipped.push({ identifierKey, reason: "deterministic-observation-already-exists" });
          result.counts.skipped++;
          continue;
        }
      } catch (err: any) {
        result.skipped.push({ identifierKey, reason: "deterministic-observation-check-failed", notes: err.message });
        result.counts.skipped++;
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
          reviewedBy: request.auth.uid
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
        receivedAt: "<serverTimestamp at execute time>",
        createdAt: "<serverTimestamp at execute time>",
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
          result.candidates!.push({
          identifierKey,
          observationId,
          deterministicPayload,
          proposedObservation,
          confidence: "high",
          reason: "Missing imported baseline observation"
        });
        result.counts.candidates!++;
      } else {
        // Execute mode
        try {
          const canonicalString = canonicalizeJson(deterministicPayload);
          const deterministicIdPayloadHash = crypto.createHash("sha256").update(canonicalString).digest("hex");

          const metadataForExecute: any = {
            migration: {
              name: "observation-model-migration",
              phase: "phase-7b",
              version: "v1",
              baseline: "tag-1.0.0",
              importedFrom: "identifiers",
              sourceIdentifierKey: identifierKey,
              timestampSource: "identifier.createdAt",
              observedAtIsInferred: true,
              deterministicIdNamespace: APPLICATION_UUID_V5_NAMESPACE,
              deterministicIdPayloadSchemaVersion: 1,
              deterministicIdPayloadHash: deterministicIdPayloadHash,
              executedBy: request.auth.uid
            }
          };

          if (identifierData.status === "active" && identifierData.objectId) {
            metadataForExecute.migration.sourceObjectId = identifierData.objectId;
          }

          const actualObservation: any = {
            observationId,
            identifierKey,
            ownerId,
            observerKind: "system",
            observedAt: identifierData.createdAt,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "import",
            observationType: "imported",
            visibility: "private",
            schemaVersion: 1,
            metadata: metadataForExecute
          };

          if (identifierData.status === "active" && identifierData.objectId) {
            actualObservation.objectId = identifierData.objectId;
          }

          const docRef = db.collection("identifierObservations").doc(observationId);
          await docRef.create(actualObservation);

          result.created!.push({
             identifierKey,
             observationId,
             status: "created"
          });
          result.counts.created!++;
        } catch (err: any) {
           if (err.code === 6 || err.message?.includes("ALREADY_EXISTS")) {
              result.counts.conflicts++;
              result.skipped.push({ identifierKey, reason: "deterministic-observation-already-exists" });
              result.counts.skipped++;
           } else {
              throw err;
           }
        }
      }

    } catch (err: any) {
      result.errors.push({ identifierKey, code: err.code || "unknown", message: err.message });
      result.counts.errors++;
    }
  }

  return result;
});
