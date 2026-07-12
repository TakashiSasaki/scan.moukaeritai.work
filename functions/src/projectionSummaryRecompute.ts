import * as admin from "firebase-admin";
import {
  reconstructObjectSummary,
  reconstructMarkerSummary,
  reconstructPlaceSummary,
} from "@scan/efp-model";
import type { Timestamp } from "@scan/efp-model";
import { getProjectionRecomputeFactQueryPlan } from "./projectionRecomputeFactPlan";
import type { ProjectionRecomputeTargetType } from "./projectionRecomputeInput";

export interface RecomputeProjectionSummaryResult {
  summary: unknown;
  factsRead: {
    associations: number;
    observations: number;
    measurements: number;
    events: number;
  };
}

function withDocumentId<T extends Record<string, unknown>>(
  doc: admin.firestore.QueryDocumentSnapshot,
  idField: string
): T {
  const data = doc.data() as T;
  return {
    ...data,
    [idField]: data[idField] ?? doc.id
  } as T;
}

export async function recomputeProjectionSummaryForTarget(params: {
  db: admin.firestore.Firestore;
  targetType: ProjectionRecomputeTargetType;
  targetId: string;
}): Promise<RecomputeProjectionSummaryResult> {
  const { db, targetType, targetId } = params;

  let associations: any[] = [];
  let observations: any[] = [];
  let measurements: any[] = [];
  let events: any[] = [];

  const factQueryPlan = getProjectionRecomputeFactQueryPlan(targetType);

  await Promise.all(
    factQueryPlan.map(async (entry) => {
      const snap = await db
        .collection(entry.collection)
        .where(entry.indexField, "array-contains", targetId)
        .get();

      const facts = snap.docs.map((doc) => withDocumentId(doc, entry.idField));

      if (entry.resultKey === "associations") associations = facts;
      else if (entry.resultKey === "observations") observations = facts;
      else if (entry.resultKey === "measurements") measurements = facts;
      else if (entry.resultKey === "events") events = facts;
    })
  );

  let ownerId = "";
  const allFacts = [...associations, ...observations, ...measurements, ...events];
  const firstFactWithOwner = allFacts.find(f => f.ownerId);
  if (firstFactWithOwner) {
    ownerId = firstFactWithOwner.ownerId;
  } else {
    const entityCollection = targetType === "object" ? "objects" : targetType === "marker" ? "markers" : "places";
    const entitySnap = await db.collection(entityCollection).doc(targetId).get();
    if (entitySnap.exists) {
      ownerId = entitySnap.data()?.ownerId || "";
    }
  }

  const asOf = admin.firestore.Timestamp.now() as unknown as Timestamp;
  let summary: any;

  if (targetType === "object") {
    summary = reconstructObjectSummary({
      objectId: targetId,
      ownerId,
      associations,
      measurements,
      observations,
      asOf,
    });
  } else if (targetType === "marker") {
    summary = reconstructMarkerSummary({
      markerKey: targetId,
      ownerId,
      associations,
      observations,
      asOf,
    });
  } else if (targetType === "place") {
    summary = reconstructPlaceSummary({
      placeId: targetId,
      ownerId,
      associations,
      observations,
      measurements,
      events,
      asOf,
    });
  }

  return {
    summary,
    factsRead: {
      associations: associations.length,
      observations: observations.length,
      measurements: measurements.length,
      events: events.length,
    },
  };
}
