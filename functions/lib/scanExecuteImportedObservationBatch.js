"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanExecuteImportedObservationBatch = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const deterministicUuid_1 = require("./deterministicUuid");
const appletConfig = {
    firestoreDatabaseId: "photo-moukaeritai-work"
};
exports.scanExecuteImportedObservationBatch = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in.");
    }
    const db = (0, firestore_1.getFirestore)(admin.app(), appletConfig.firestoreDatabaseId);
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new https_1.HttpsError("permission-denied", "You do not have administrative privileges.");
    }
    const data = request.data || {};
    const { mode, ownerId, identifierKeys } = data;
    const rawMaxBatchSize = data.maxBatchSize;
    if (mode !== "dryRun") {
        throw new https_1.HttpsError("invalid-argument", "Only dryRun mode is supported.");
    }
    if (!ownerId || typeof ownerId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "ownerId must be a non-empty string.");
    }
    if (!Array.isArray(identifierKeys) || identifierKeys.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "identifierKeys must be a non-empty array of strings.");
    }
    for (const key of identifierKeys) {
        if (!key || typeof key !== "string") {
            throw new https_1.HttpsError("invalid-argument", "All elements in identifierKeys must be non-empty strings.");
        }
    }
    let maxBatchSize = 20;
    if (rawMaxBatchSize !== undefined) {
        if (typeof rawMaxBatchSize !== "number" || !Number.isInteger(rawMaxBatchSize) || rawMaxBatchSize < 1) {
            throw new https_1.HttpsError("invalid-argument", "maxBatchSize must be a positive integer.");
        }
        maxBatchSize = rawMaxBatchSize;
    }
    const uniqueIdentifierKeys = Array.from(new Set(identifierKeys));
    const effectiveMaxBatchSize = Math.min(maxBatchSize, 20);
    if (uniqueIdentifierKeys.length > effectiveMaxBatchSize) {
        throw new https_1.HttpsError("invalid-argument", `Batch size exceeds the maximum limit of ${effectiveMaxBatchSize}.`);
    }
    const result = {
        mode: "dryRun",
        checkedAt: new Date().toISOString(),
        executedBy: request.auth.uid,
        ownerId,
        limits: {
            maxBatchSize: effectiveMaxBatchSize
        },
        counts: {
            requested: uniqueIdentifierKeys.length,
            checked: 0,
            candidates: 0,
            skipped: 0,
            conflicts: 0,
            errors: 0
        },
        candidates: [],
        skipped: [],
        errors: []
    };
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
            if ((identifierData === null || identifierData === void 0 ? void 0 : identifierData.identifierKey) && identifierData.identifierKey !== identifierKey) {
                result.skipped.push({ identifierKey, reason: "identifier-key-mismatch" });
                result.counts.skipped++;
                continue;
            }
            if ((identifierData === null || identifierData === void 0 ? void 0 : identifierData.ownerId) !== ownerId) {
                result.skipped.push({ identifierKey, reason: "owner-id-mismatch" });
                result.counts.skipped++;
                continue;
            }
            if (["retired", "lost", "replaced"].includes(identifierData === null || identifierData === void 0 ? void 0 : identifierData.status)) {
                result.skipped.push({ identifierKey, reason: "unsupported-identifier-status", notes: `Status is ${identifierData === null || identifierData === void 0 ? void 0 : identifierData.status}` });
                result.counts.skipped++;
                continue;
            }
            if (!["active", "unassigned"].includes(identifierData === null || identifierData === void 0 ? void 0 : identifierData.status)) {
                result.skipped.push({ identifierKey, reason: "invalid-identifier-status" });
                result.counts.skipped++;
                continue;
            }
            if (!(identifierData === null || identifierData === void 0 ? void 0 : identifierData.identifierKey) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.ownerId) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.kind) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.scheme) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.canonicalValue) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.status) || !(identifierData === null || identifierData === void 0 ? void 0 : identifierData.createdAt)) {
                result.skipped.push({ identifierKey, reason: "missing-required-fields" });
                result.counts.skipped++;
                continue;
            }
            let createdAtMillis;
            if (identifierData.createdAt.toMillis) {
                createdAtMillis = identifierData.createdAt.toMillis();
            }
            else {
                result.skipped.push({ identifierKey, reason: "invalid-created-at" });
                result.counts.skipped++;
                continue;
            }
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
            let existingObservations = new Map();
            try {
                const [obsSnapNew, obsSnapLegacy] = await Promise.all([obsQueryNew.get(), obsQueryLegacy.get()]);
                if (obsSnapNew.docs.length === maxObservationsPerIdentifier || obsSnapLegacy.docs.length === maxObservationsPerIdentifier) {
                    result.skipped.push({ identifierKey, reason: "observation-check-limit-hit" });
                    result.counts.skipped++;
                    continue;
                }
                obsSnapNew.docs.forEach((d) => existingObservations.set(d.id, d.data()));
                obsSnapLegacy.docs.forEach((d) => existingObservations.set(d.id, d.data()));
                for (const obs of existingObservations.values()) {
                    const isImported = obs.source === "import" || obs.observationType === "imported";
                    if (!isImported) {
                        hasRealObservations = true;
                        break;
                    }
                }
            }
            catch (err) {
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
                observationId = (0, deterministicUuid_1.uuidV5FromCanonicalPayload)(deterministicPayload);
            }
            catch (err) {
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
            }
            catch (err) {
                result.skipped.push({ identifierKey, reason: "deterministic-observation-check-failed", notes: err.message });
                result.counts.skipped++;
                continue;
            }
            const metadata = {
                migration: {
                    name: "observation-model-migration",
                    phase: "phase-7a",
                    version: "v1",
                    baseline: "tag-1.0.0",
                    importedFrom: "identifiers",
                    sourceIdentifierKey: identifierKey,
                    timestampSource: "identifier.createdAt",
                    observedAtIsInferred: true,
                    deterministicIdNamespace: deterministicUuid_1.APPLICATION_UUID_V5_NAMESPACE,
                    deterministicIdPayloadSchemaVersion: 1,
                    reviewedBy: request.auth.uid
                }
            };
            if (identifierData.status === "active" && identifierData.objectId) {
                metadata.migration.sourceObjectId = identifierData.objectId;
            }
            const proposedObservation = {
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
            result.candidates.push({
                identifierKey,
                observationId,
                deterministicPayload,
                proposedObservation,
                confidence: "high",
                reason: "Missing imported baseline observation"
            });
            result.counts.candidates++;
        }
        catch (err) {
            result.errors.push({ identifierKey, code: err.code || "unknown", message: err.message });
            result.counts.errors++;
        }
    }
    return result;
});
//# sourceMappingURL=scanExecuteImportedObservationBatch.js.map