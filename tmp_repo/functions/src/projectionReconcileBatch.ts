import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { ProjectionRecomputeInputError } from "./projectionRecomputeInput";
import {
  parseReconcileProjectionSummariesInput,
  type ReconcileProjectionSummariesInput
} from "./projectionReconcileBatchInput";
import {
  reconcileTargetProjectionSummary,
  ProjectionSummaryReconciliationError,
  type ProjectionReconciliationTargetResult,
  type ProjectionReconciliationTargetErrorResult
} from "./projectionSummaryReconciliation";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

export const reconcileProjectionSummaries = onCall(
  async (request: CallableRequest<ReconcileProjectionSummariesInput>) => {
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
      parsedInput = parseReconcileProjectionSummariesInput(request.data);
    } catch (error) {
      if (error instanceof ProjectionRecomputeInputError) {
        throw new HttpsError("invalid-argument", error.message);
      }
      throw error;
    }

    const { targets, includeSummaries } = parsedInput;

    let equalCount = 0;
    let differentCount = 0;
    let missingSummaryCount = 0;
    let errorCount = 0;

    const results: Array<ProjectionReconciliationTargetResult | ProjectionReconciliationTargetErrorResult> = [];

    // Process sequentially for safety constraints
    for (const target of targets) {
      try {
        const result = await reconcileTargetProjectionSummary({
          db,
          ...target,
          includeSummaries
        });

        results.push(result);

        if (result.existingSummaryExists) {
          if (result.reconciliation.equal) {
            equalCount++;
          } else {
            differentCount++;
          }
        } else {
          missingSummaryCount++;
        }
      } catch (error) {
        errorCount++;

        let code: "not-found" | "internal" = "internal";
        let message = "An unexpected error occurred.";

        if (error instanceof ProjectionSummaryReconciliationError) {
          code = error.code;
          message = error.message;
        } else {
          console.error(`Error reconciling target ${target.targetType} ${target.targetId}:`, error);
        }

        const errorResult: ProjectionReconciliationTargetErrorResult = {
          success: false,
          targetType: target.targetType,
          targetId: target.targetId,
          summaryPath: target.summaryPath,
          error: {
            code,
            message
          },
          written: false
        };

        results.push(errorResult);
      }
    }

    return {
      success: true,
      includeSummaries,
      totalTargets: targets.length,
      equalCount,
      differentCount,
      missingSummaryCount,
      errorCount,
      results,
      written: false
    };
  }
);
