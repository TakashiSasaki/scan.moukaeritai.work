export type ProjectionRecomputeTargetType = "object" | "marker" | "place";

export interface RecomputeProjectionSummaryInput {
  targetType?: unknown;
  targetId?: unknown;
  dryRun?: unknown;
}

export interface ParsedRecomputeProjectionSummaryInput {
  targetType: ProjectionRecomputeTargetType;
  targetId: string;
  dryRun: boolean;
  entityCollection: "objects" | "markers" | "places";
  summaryCollection: "objectSummaries" | "markerSummaries" | "placeSummaries";
  summaryPath: string;
}

export class ProjectionRecomputeInputError extends Error {
  readonly code = "invalid-argument";
}

const entityCollectionByTargetType = {
  object: "objects",
  marker: "markers",
  place: "places"
} as const;

const summaryCollectionByTargetType = {
  object: "objectSummaries",
  marker: "markerSummaries",
  place: "placeSummaries"
} as const;

export function parseRecomputeProjectionSummaryInput(
  input: RecomputeProjectionSummaryInput | undefined | null
): ParsedRecomputeProjectionSummaryInput {
  const data = input || {};

  const rawTargetType = data.targetType;
  const rawTargetId = data.targetId;

  if (data.dryRun !== undefined && typeof data.dryRun !== "boolean") {
    throw new ProjectionRecomputeInputError("dryRun must be a boolean when provided.");
  }
  const dryRun = (data.dryRun ?? true) as boolean;

  if (
    !rawTargetType ||
    typeof rawTargetType !== "string" ||
    (rawTargetType !== "object" && rawTargetType !== "marker" && rawTargetType !== "place")
  ) {
    throw new ProjectionRecomputeInputError('targetType must be "object", "marker", or "place".');
  }

  const targetType = rawTargetType as ProjectionRecomputeTargetType;

  if (!rawTargetId || typeof rawTargetId !== "string" || rawTargetId.trim() === "") {
    throw new ProjectionRecomputeInputError("targetId must be a non-empty string.");
  }

  const targetId = rawTargetId.trim();

  if (targetId.includes("/")) {
    throw new ProjectionRecomputeInputError("targetId must not contain '/'.");
  }

  const entityCollection = entityCollectionByTargetType[targetType];
  const summaryCollection = summaryCollectionByTargetType[targetType];
  const summaryPath = `${summaryCollection}/${targetId}`;

  return {
    targetType,
    targetId,
    dryRun,
    entityCollection,
    summaryCollection,
    summaryPath,
  };
}
