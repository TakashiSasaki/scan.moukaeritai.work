import {
  parseRecomputeProjectionSummaryInput,
  ProjectionRecomputeInputError,
  type ProjectionRecomputeTargetType
} from "./projectionRecomputeInput";

export interface ReconcileProjectionSummariesInput {
  targets: Array<{
    targetType: "object" | "marker" | "place";
    targetId: string;
  }>;
  includeSummaries?: boolean;
}

export interface ParsedReconcileProjectionSummariesInput {
  targets: Array<{
    targetType: ProjectionRecomputeTargetType;
    targetId: string;
    entityCollection: "objects" | "markers" | "places";
    summaryCollection: "objectSummaries" | "markerSummaries" | "placeSummaries";
    summaryPath: string;
  }>;
  includeSummaries: boolean;
}

export function parseReconcileProjectionSummariesInput(
  input: unknown
): ParsedReconcileProjectionSummariesInput {
  if (!input || typeof input !== "object") {
    throw new ProjectionRecomputeInputError("Input must be an object.");
  }

  const data = input as Record<string, unknown>;

  if (data.includeSummaries !== undefined && typeof data.includeSummaries !== "boolean") {
    throw new ProjectionRecomputeInputError("includeSummaries must be a boolean when provided.");
  }
  const includeSummaries = (data.includeSummaries ?? false) as boolean;

  if (!Array.isArray(data.targets)) {
    throw new ProjectionRecomputeInputError("targets must be an array.");
  }

  if (data.targets.length === 0) {
    throw new ProjectionRecomputeInputError("targets array cannot be empty.");
  }

  const maxTargets = includeSummaries ? 5 : 20;
  if (data.targets.length > maxTargets) {
    throw new ProjectionRecomputeInputError(`Maximum target count exceeded. Limit is ${maxTargets} when includeSummaries is ${includeSummaries}.`);
  }

  const parsedTargets: ParsedReconcileProjectionSummariesInput["targets"] = [];
  const seenTargets = new Set<string>();

  for (const target of data.targets) {
    if (!target || typeof target !== "object") {
      throw new ProjectionRecomputeInputError("Each target must be an object.");
    }
    const t = target as Record<string, unknown>;

    // Reuse single target parser for base validation of each target
    const singleParsed = parseRecomputeProjectionSummaryInput({
      targetType: t.targetType,
      targetId: t.targetId,
      dryRun: true // irrelevant here
    });

    const targetKey = `${singleParsed.targetType}:${singleParsed.targetId}`;
    if (seenTargets.has(targetKey)) {
      throw new ProjectionRecomputeInputError("Duplicate target specified.");
    }
    seenTargets.add(targetKey);

    parsedTargets.push({
      targetType: singleParsed.targetType,
      targetId: singleParsed.targetId,
      entityCollection: singleParsed.entityCollection,
      summaryCollection: singleParsed.summaryCollection,
      summaryPath: singleParsed.summaryPath
    });
  }

  return {
    targets: parsedTargets,
    includeSummaries
  };
}
