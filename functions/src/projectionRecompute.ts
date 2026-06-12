import { onCall, HttpsError } from "firebase-functions/v2/https";

export const recomputeProjectionSummary = onCall(async () => {
  throw new HttpsError(
    "failed-precondition",
    "Projection recompute is temporarily disabled until @scan/efp-model is packaged into the Firebase Functions deployment artifact."
  );
});
