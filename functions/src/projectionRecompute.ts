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

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

export const recomputeProjectionSummary = onCall(
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
      dryRun,
      entityCollection,
      summaryCollection,
      summaryPath,
    } = parsedInput;

    try {
      const entitySnap = await db.collection(entityCollection).doc(targetId).get();
      if (!entitySnap.exists) {
        throw new HttpsError("not-found", "Target entity not found.");
      }

      const { summary, factsRead } = await recomputeProjectionSummaryForTarget({
        db,
        targetType,
        targetId,
      });

      let written = false;
      const cleanSummary = stripUndefinedDeep(summary);

      if (!dryRun) {
        await db.collection(summaryCollection).doc(targetId).set(cleanSummary as admin.firestore.WithFieldValue<admin.firestore.DocumentData>);
        written = true;
      }

      return {
        success: true,
        dryRun,
        targetType,
        targetId,
        summaryPath,
        summary: cleanSummary,
        factsRead,
        written,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Projection Recompute Error:", error);
      throw new HttpsError("internal", "An unexpected error occurred during projection recomputation.");
    }
  }
);
