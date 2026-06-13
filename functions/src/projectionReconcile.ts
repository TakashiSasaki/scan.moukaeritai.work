import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { stripUndefinedDeep } from "@scan/efp-model";
import {
  parseRecomputeProjectionSummaryInput,
  ProjectionRecomputeInputError,
  type RecomputeProjectionSummaryInput,
} from "./projectionRecomputeInput";
import { recomputeProjectionSummaryForTarget } from "./projectionSummaryRecompute";
import { diffProjectionSummaries } from "./projectionSummaryDiff";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

export const reconcileProjectionSummary = onCall(
  async (request: CallableRequest<RecomputeProjectionSummaryInput>) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const db = getDb();
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();

    if (!adminDoc.exists) {
      throw new HttpsError("permission-denied", "Admin privileges are required.");
    }

    let parsedInput;
    try {
      // Re-use the existing input parser, but ignore its returned dryRun flag
      // as reconciliation is always read-only. We only need the payload to specify type and id.
      parsedInput = parseRecomputeProjectionSummaryInput(request.data);
    } catch (error) {
      if (error instanceof ProjectionRecomputeInputError) {
        throw new HttpsError("invalid-argument", error.message);
      }
      throw error;
    }

    const {
      targetType,
      targetId,
      entityCollection,
      summaryCollection,
      summaryPath,
    } = parsedInput;

    try {
      const entitySnap = await db.collection(entityCollection).doc(targetId).get();
      if (!entitySnap.exists) {
        throw new HttpsError("not-found", "Target entity not found.");
      }

      const { summary: recomputedSummaryRaw, factsRead } = await recomputeProjectionSummaryForTarget({
        db,
        targetType,
        targetId,
      });

      const existingSummarySnap = await db.collection(summaryCollection).doc(targetId).get();
      const existingSummaryExists = existingSummarySnap.exists;

      const existingSummaryRaw = existingSummaryExists ? existingSummarySnap.data() : undefined;

      const recomputedSummary = stripUndefinedDeep(recomputedSummaryRaw);
      const existingSummaryPayload = existingSummaryExists ? stripUndefinedDeep(existingSummaryRaw) : null;

      // If undefined is passed, the entire root object will be reported as "missing"
      const existingSummaryDiffInput = existingSummaryExists ? existingSummaryPayload : undefined;

      const reconciliation = diffProjectionSummaries(recomputedSummary, existingSummaryDiffInput, {
        ignoredPaths: ["$.asOf"]
      });

      return {
        success: true,
        targetType,
        targetId,
        summaryPath,
        existingSummaryExists,
        factsRead,
        reconciliation,
        recomputedSummary,
        existingSummary: existingSummaryPayload,
        written: false,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Projection Reconcile Error:", error);
      throw new HttpsError("internal", "An unexpected error occurred during projection reconciliation.");
    }
  }
);
