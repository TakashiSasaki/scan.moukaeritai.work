import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { executeImportedObservationBatchCore } from "./scanExecuteImportedObservationBatchCore";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

export const scanExecuteImportedObservationBatch = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const db = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  const callerUid = request.auth.uid;
  const data = request.data || {};

  return executeImportedObservationBatchCore(db, callerUid, data);
});

