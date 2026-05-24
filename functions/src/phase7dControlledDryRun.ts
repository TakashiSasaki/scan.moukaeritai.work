import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { uuidV5FromCanonicalPayload } from "./deterministicUuid";

const PROJECT_ID = "moukaeritaid";
const FIRESTORE_DATABASE_ID = "photo-moukaeritai-work";
const MAX_KEYS_HARD_LIMIT = 5;
const OBSERVATION_QUERY_LIMIT = 20;

interface DryRunSummary {
  mode: "dryRun";
  checkedAt: string;
  projectId: string;
  databaseId: string;
  ownerId: string;
  limits: {
    maxBatchSize: number;
    observationQueryLimitPerPath: number;
  };
  counts: {
    requested: number;
    checked: number;
    candidates: number;
    skipped: number;
    conflicts: number;
    errors: number;
  };
  candidates: Array<{ identifierKey: string; observationId: string }>;
  skipped: Array<{ identifierKey: string; reason: string; notes?: string }>;
  errors: Array<{ identifierKey: string; message: string }>;
}

const IDENTIFIER_KEYS_INPUT_LABEL = "IDENTIFIER_KEYS_JSON (workflow input: identifier_keys_json)";

function parseIdentifierKeys(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${IDENTIFIER_KEYS_INPUT_LABEL} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${IDENTIFIER_KEYS_INPUT_LABEL} must be a JSON array of strings.`);
  }

  const keys = parsed.filter((v): v is string => typeof v === "string").map((k) => k.trim()).filter(Boolean);
  if (keys.length !== parsed.length) {
    throw new Error(`${IDENTIFIER_KEYS_INPUT_LABEL} must contain only non-empty strings.`);
  }

  return Array.from(new Set(keys));
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function initAdminApp(): admin.app.App {
  const serviceAccountJson = getRequiredEnv("FIREBASE_SERVICE_ACCOUNT_KEY");
  const serviceAccount = JSON.parse(serviceAccountJson);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
  });
}

async function runDryRun(): Promise<void> {
  const ownerId = getRequiredEnv("OWNER_ID");
  const identifierKeysJson = getRequiredEnv("IDENTIFIER_KEYS_JSON");
  const rawMaxBatchSize = process.env.MAX_BATCH_SIZE?.trim() || "5";
  const parsedMaxBatchSize = Number.parseInt(rawMaxBatchSize, 10);

  if (!Number.isInteger(parsedMaxBatchSize) || parsedMaxBatchSize < 1) {
    throw new Error("MAX_BATCH_SIZE must be a positive integer string.");
  }

  const maxBatchSize = Math.min(parsedMaxBatchSize, MAX_KEYS_HARD_LIMIT);
  const uniqueIdentifierKeys = parseIdentifierKeys(identifierKeysJson);

  if (uniqueIdentifierKeys.length === 0) {
    throw new Error("identifier_keys_json must include at least one identifier key.");
  }
  if (uniqueIdentifierKeys.length > maxBatchSize) {
    throw new Error(`identifier_keys_json contains too many keys. Max allowed is ${maxBatchSize}.`);
  }

  const app = initAdminApp();
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);

  const summary: DryRunSummary = {
    mode: "dryRun",
    checkedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
    ownerId,
    limits: {
      maxBatchSize,
      observationQueryLimitPerPath: OBSERVATION_QUERY_LIMIT,
    },
    counts: {
      requested: uniqueIdentifierKeys.length,
      checked: 0,
      candidates: 0,
      skipped: 0,
      conflicts: 0,
      errors: 0,
    },
    candidates: [],
    skipped: [],
    errors: [],
  };

  for (const identifierKey of uniqueIdentifierKeys) {
    summary.counts.checked++;
    try {
      const identifierDoc = await db.collection("identifiers").doc(identifierKey).get();
      if (!identifierDoc.exists) {
        summary.skipped.push({ identifierKey, reason: "identifier-missing" });
        summary.counts.skipped++;
        continue;
      }

      const identifierData = identifierDoc.data();
      if (identifierData?.identifierKey && identifierData.identifierKey !== identifierKey) {
        summary.skipped.push({ identifierKey, reason: "identifier-key-mismatch" });
        summary.counts.skipped++;
        continue;
      }
      if (identifierData?.ownerId !== ownerId) {
        summary.skipped.push({ identifierKey, reason: "owner-id-mismatch" });
        summary.counts.skipped++;
        continue;
      }
      if (["retired", "lost", "replaced"].includes(identifierData?.status)) {
        summary.skipped.push({ identifierKey, reason: "unsupported-identifier-status", notes: `Status is ${identifierData?.status}` });
        summary.counts.skipped++;
        continue;
      }
      if (!["active", "unassigned"].includes(identifierData?.status)) {
        summary.skipped.push({ identifierKey, reason: "invalid-identifier-status" });
        summary.counts.skipped++;
        continue;
      }
      if (!identifierData?.identifierKey || !identifierData?.ownerId || !identifierData?.kind || !identifierData?.scheme || !identifierData?.canonicalValue || !identifierData?.status || !identifierData?.createdAt) {
        summary.skipped.push({ identifierKey, reason: "missing-required-fields" });
        summary.counts.skipped++;
        continue;
      }
      if (!identifierData.createdAt || typeof identifierData.createdAt.toMillis !== "function") {
        summary.skipped.push({ identifierKey, reason: "missing-reliable-timestamp" });
        summary.counts.skipped++;
        continue;
      }

      const obsQueryNew = db.collection("identifierObservations")
        .where("identifierKey", "==", identifierKey)
        .where("ownerId", "==", ownerId)
        .limit(OBSERVATION_QUERY_LIMIT);
      const obsQueryLegacy = db.collection("identifierObservations")
        .where("identifierKey", "==", identifierKey)
        .where("observerUid", "==", ownerId)
        .limit(OBSERVATION_QUERY_LIMIT);

      let obsSnapNew;
      let obsSnapLegacy;
      try {
        [obsSnapNew, obsSnapLegacy] = await Promise.all([obsQueryNew.get(), obsQueryLegacy.get()]);
      } catch (err: any) {
        summary.skipped.push({ identifierKey, reason: "observation-check-failed", notes: err?.message });
        summary.counts.skipped++;
        continue;
      }
      if (obsSnapNew.docs.length === OBSERVATION_QUERY_LIMIT || obsSnapLegacy.docs.length === OBSERVATION_QUERY_LIMIT) {
        summary.skipped.push({ identifierKey, reason: "observation-check-limit-hit" });
        summary.counts.skipped++;
        continue;
      }

      const existingObservations = new Map<string, any>();
      obsSnapNew.docs.forEach((d) => existingObservations.set(d.id, d.data()));
      obsSnapLegacy.docs.forEach((d) => existingObservations.set(d.id, d.data()));

      let hasRealObservations = false;
      for (const obs of existingObservations.values()) {
        const isImported = obs.source === "import" || obs.observationType === "imported";
        if (!isImported) {
          hasRealObservations = true;
          break;
        }
      }
      if (hasRealObservations) {
        summary.skipped.push({ identifierKey, reason: "has-real-observations" });
        summary.counts.skipped++;
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
        ownerId,
        identifierKey,
      };
      let observationId;
      try {
        observationId = uuidV5FromCanonicalPayload(deterministicPayload);
      } catch (err: any) {
        summary.skipped.push({ identifierKey, reason: "uuid-generation-failed", notes: err?.message });
        summary.counts.skipped++;
        continue;
      }

      if (existingObservations.has(observationId)) {
        summary.counts.conflicts++;
        summary.skipped.push({ identifierKey, reason: "deterministic-observation-already-exists" });
        summary.counts.skipped++;
        continue;
      }
      try {
        const detObsDoc = await db.collection("identifierObservations").doc(observationId).get();
        if (detObsDoc.exists) {
          summary.counts.conflicts++;
          summary.skipped.push({ identifierKey, reason: "deterministic-observation-already-exists" });
          summary.counts.skipped++;
          continue;
        }
      } catch (err: any) {
        summary.skipped.push({ identifierKey, reason: "deterministic-observation-check-failed", notes: err?.message });
        summary.counts.skipped++;
        continue;
      }

      summary.candidates.push({ identifierKey, observationId });
      summary.counts.candidates++;
    } catch (error) {
      summary.counts.errors++;
      summary.errors.push({ identifierKey, message: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

runDryRun().catch((error) => {
  console.error(JSON.stringify({
    mode: "dryRun",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
