import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
  parseRecomputeProjectionSummaryInput,
  ProjectionRecomputeInputError,
  type RecomputeProjectionSummaryInput,
} from "./projectionRecomputeInput";
import { reconcileTargetProjectionSummary, ProjectionSummaryReconciliationError } from "./projectionSummaryReconciliation";

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
      const result = await reconcileTargetProjectionSummary({
        db,
        targetType,
        targetId,
        entityCollection,
        summaryCollection,
        summaryPath,
        includeSummaries: true // single target callable always includes summaries for backward compatibility
      });

      return result;
    } catch (error) {
      if (error instanceof ProjectionSummaryReconciliationError) {
        throw new HttpsError(error.code, error.message);
      }
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Projection Reconcile Error:", error);
      throw new HttpsError("internal", "An unexpected error occurred during projection reconciliation.");
    }
  }
);
