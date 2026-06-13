export type ProjectionRecomputeTargetType = "object" | "marker" | "place";

export type ProjectionFactCollection =
  | "associations"
  | "observations"
  | "measurements"
  | "events";

export type ProjectionFactResultKey =
  | "associations"
  | "observations"
  | "measurements"
  | "events";

export type ProjectionFactIdField =
  | "associationId"
  | "observationId"
  | "measurementId"
  | "eventId";

export type ProjectionFactIndexField =
  | "objectIds"
  | "markerKeys"
  | "placeIds";

export interface ProjectionFactQueryPlanEntry {
  readonly collection: ProjectionFactCollection;
  readonly resultKey: ProjectionFactResultKey;
  readonly idField: ProjectionFactIdField;
  readonly indexField: ProjectionFactIndexField;
}

export function getProjectionRecomputeFactQueryPlan(
  targetType: ProjectionRecomputeTargetType
): readonly ProjectionFactQueryPlanEntry[] {
  if (targetType === "object") {
    return [
      {
        collection: "associations",
        resultKey: "associations",
        idField: "associationId",
        indexField: "objectIds",
      },
      {
        collection: "observations",
        resultKey: "observations",
        idField: "observationId",
        indexField: "objectIds",
      },
      {
        collection: "measurements",
        resultKey: "measurements",
        idField: "measurementId",
        indexField: "objectIds",
      },
    ];
  }

  if (targetType === "marker") {
    return [
      {
        collection: "associations",
        resultKey: "associations",
        idField: "associationId",
        indexField: "markerKeys",
      },
      {
        collection: "observations",
        resultKey: "observations",
        idField: "observationId",
        indexField: "markerKeys",
      },
    ];
  }

  if (targetType === "place") {
    return [
      {
        collection: "associations",
        resultKey: "associations",
        idField: "associationId",
        indexField: "placeIds",
      },
      {
        collection: "observations",
        resultKey: "observations",
        idField: "observationId",
        indexField: "placeIds",
      },
      {
        collection: "measurements",
        resultKey: "measurements",
        idField: "measurementId",
        indexField: "placeIds",
      },
      {
        collection: "events",
        resultKey: "events",
        idField: "eventId",
        indexField: "placeIds",
      },
    ];
  }

  throw new Error(`Unsupported targetType for projection recompute: ${targetType}`);
}
