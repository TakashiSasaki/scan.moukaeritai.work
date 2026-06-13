import * as admin from "firebase-admin";
import { stripUndefinedDeep } from "@scan/efp-model";
import { diffProjectionSummaries } from "./projectionSummaryDiff";
import { recomputeProjectionSummaryForTarget } from "./projectionSummaryRecompute";
import type { ProjectionRecomputeTargetType } from "./projectionRecomputeInput";

export class ProjectionSummaryReconciliationError extends Error {
  constructor(
    public readonly code: "not-found" | "internal",
    message: string
  ) {
    super(message);
    this.name = "ProjectionSummaryReconciliationError";
  }
}

export interface ProjectionReconciliationTargetResult {
  success: true;
  targetType: ProjectionRecomputeTargetType;
  targetId: string;
  summaryPath: string;
  existingSummaryExists: boolean;
  factsRead: {
    associations: number;
    observations: number;
    measurements: number;
    events: number;
  };
  reconciliation: {
    equal: boolean;
    differenceCount: number;
    missingPaths: string[];
    extraPaths: string[];
    changedPaths: string[];
    ignoredPaths?: string[];
  };
  written: false;
  recomputedSummary?: unknown;
  existingSummary?: unknown | null;
}

export interface ProjectionReconciliationTargetErrorResult {
  success: false;
  targetType: ProjectionRecomputeTargetType;
  targetId: string;
  summaryPath: string;
  error: {
    code: "not-found" | "internal";
    message: string;
  };
  written: false;
}

export async function reconcileTargetProjectionSummary(params: {
  db: admin.firestore.Firestore;
  targetType: ProjectionRecomputeTargetType;
  targetId: string;
  entityCollection: "objects" | "markers" | "places";
  summaryCollection: "objectSummaries" | "markerSummaries" | "placeSummaries";
  summaryPath: string;
  includeSummaries: boolean;
}): Promise<ProjectionReconciliationTargetResult> {
  const {
    db,
    targetType,
    targetId,
    entityCollection,
    summaryCollection,
    summaryPath,
    includeSummaries
  } = params;

  try {
    const entitySnap = await db.collection(entityCollection).doc(targetId).get();
    if (!entitySnap.exists) {
      throw new ProjectionSummaryReconciliationError("not-found", "Target entity not found.");
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

    const existingSummaryDiffInput = existingSummaryExists ? existingSummaryPayload : undefined;

    const reconciliation = diffProjectionSummaries(recomputedSummary, existingSummaryDiffInput, {
      ignoredPaths: ["$.asOf"]
    });

    const result: ProjectionReconciliationTargetResult = {
      success: true,
      targetType,
      targetId,
      summaryPath,
      existingSummaryExists,
      factsRead,
      reconciliation,
      written: false,
    };

    if (includeSummaries) {
      result.recomputedSummary = recomputedSummary;
      result.existingSummary = existingSummaryPayload;
    }

    return result;
  } catch (error) {
    if (error instanceof ProjectionSummaryReconciliationError) {
      throw error;
    }
    console.error(`Error reconciling projection summary for ${targetType} ${targetId}:`, error);
    throw new ProjectionSummaryReconciliationError("internal", "An unexpected error occurred during projection reconciliation.");
  }
}
