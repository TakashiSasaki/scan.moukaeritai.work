import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GeoPoint, getFirestore, Timestamp } from "firebase-admin/firestore";
import { generateUUIDv7 } from "@scan/efp-model";
import * as fs from "fs";
import * as path from "path";
import {
  COMMAND_RECEIPT_FIELDS,
  REPLAY_COMPARISON_FIELDS,
  REQUEST_HASH_VERSION,
  CANONICAL_JSON_VERSION,
  RuntimeProfile,
  SubmitFactCommandCoreError,
  submitFactCommandCore,
} from "./submitFactCommandCore";

export {
  COMMAND_RECEIPT_FIELDS,
  REPLAY_COMPARISON_FIELDS,
  REQUEST_HASH_VERSION,
  CANONICAL_JSON_VERSION,
};
export type { RuntimeProfile };

const appletConfig = { firestoreDatabaseId: "photo-moukaeritai-work" };
function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

const runtimeProfileCandidates = [
  path.join(__dirname, "../vendor/contracts/runtime-profile.json"),
  path.join(__dirname, "../../vendor/contracts/runtime-profile.json"),
  path.join(process.cwd(), "vendor/contracts/runtime-profile.json"),
];

export function loadRuntimeProfileForSubmitFactCommand(
  profilePath?: string,
): RuntimeProfile {
  const candidates = profilePath ? [profilePath] : runtimeProfileCandidates;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const profile = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (
        !profile.applicationVersion ||
        !profile.callableApiVersion ||
        !profile.efpModelVersion
      ) {
        throw new Error(`Invalid runtime profile: ${candidate}`);
      }
      return profile as RuntimeProfile;
    }
  }
  throw new Error(
    `Missing functions vendor runtime profile. Checked: ${candidates.join(", ")}`,
  );
}

export const submitFactCommand = onCall(async (request) => {
  if (!request.auth?.uid)
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to submit a Fact.",
    );
  let runtimeProfile: RuntimeProfile;
  try {
    runtimeProfile = loadRuntimeProfileForSubmitFactCommand();
  } catch (e: any) {
    throw new HttpsError("internal", e.message);
  }
  try {
    return await submitFactCommandCore(
      { actorUid: request.auth.uid, data: request.data },
      {
        db: getDb(),
        runtimeProfile,
        generateFactId: generateUUIDv7,
        nowIso: () => new Date().toISOString(),
        serverTimestamp: () => Timestamp.now(),
        timestampFromDate: (date) => Timestamp.fromDate(date),
        geoPoint: (latitude, longitude) => new GeoPoint(latitude, longitude),
      },
    );
  } catch (e: any) {
    if (e instanceof SubmitFactCommandCoreError)
      throw new HttpsError(e.code, e.message);
    throw e;
  }
});
