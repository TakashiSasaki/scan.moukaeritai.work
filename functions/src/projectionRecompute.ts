import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import {
  reconstructObjectSummary,
  reconstructMarkerSummary,
  reconstructPlaceSummary,
  stripUndefinedDeep,
} from "@scan/efp-model";
import type { Timestamp } from "@scan/efp-model";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
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

interface RecomputeProjectionSummaryInput {
  targetType?: unknown;
  targetId?: unknown;
  dryRun?: unknown;
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

    const data = request.data || {};
    const rawTargetType = data.targetType;
    const rawTargetId = data.targetId;

    if (data.dryRun !== undefined && typeof data.dryRun !== "boolean") {
      throw new HttpsError("invalid-argument", "dryRun must be a boolean when provided.");
    }
    const dryRun = data.dryRun ?? true;

    if (!rawTargetType || typeof rawTargetType !== "string" || !["object", "marker", "place"].includes(rawTargetType)) {
      throw new HttpsError("invalid-argument", 'targetType must be "object", "marker", or "place".');
    }
    const targetType = rawTargetType as keyof typeof entityCollectionByTargetType;

    if (!rawTargetId || typeof rawTargetId !== "string" || rawTargetId.trim() === "") {
      throw new HttpsError("invalid-argument", "targetId must be a non-empty string.");
    }

    const targetId = rawTargetId.trim();
    if (targetId.includes("/")) {
      throw new HttpsError("invalid-argument", "targetId must not contain '/'.");
    }

    const entityCollection = entityCollectionByTargetType[targetType];
    const summaryCollection = summaryCollectionByTargetType[targetType];

    try {
      const entitySnap = await db.collection(entityCollection).doc(targetId).get();
    if (!entitySnap.exists) {
      throw new HttpsError("not-found", "Target entity not found.");
    }

    const asOf = admin.firestore.Timestamp.now() as unknown as Timestamp;

    let associations: any[] = [];
    let observations: any[] = [];
    let measurements: any[] = [];
    let events: any[] = [];

    let summary: any;

      if (targetType === "object") {
        const [assocSnap, obsSnap, measSnap] = await Promise.all([
          db.collection("associations").where("objectIds", "array-contains", targetId).get(),
          db.collection("observations").where("objectIds", "array-contains", targetId).get(),
          db.collection("measurements").where("objectIds", "array-contains", targetId).get(),
        ]);

        associations = assocSnap.docs.map(d => withDocumentId(d, "associationId"));
        observations = obsSnap.docs.map(d => withDocumentId(d, "observationId"));
        measurements = measSnap.docs.map(d => withDocumentId(d, "measurementId"));

        summary = reconstructObjectSummary({
          objectId: targetId,
          associations,
          measurements,
          observations,
          asOf,
        });

      } else if (targetType === "marker") {
        const [assocSnap, obsSnap] = await Promise.all([
          db.collection("associations").where("markerKeys", "array-contains", targetId).get(),
          db.collection("observations").where("markerKeys", "array-contains", targetId).get(),
        ]);

        associations = assocSnap.docs.map(d => withDocumentId(d, "associationId"));
        observations = obsSnap.docs.map(d => withDocumentId(d, "observationId"));

        summary = reconstructMarkerSummary({
          markerKey: targetId,
          associations,
          observations,
          asOf,
        });

      } else if (targetType === "place") {
        const [assocSnap, obsSnap, measSnap, evSnap] = await Promise.all([
          db.collection("associations").where("placeIds", "array-contains", targetId).get(),
          db.collection("observations").where("placeIds", "array-contains", targetId).get(),
          db.collection("measurements").where("placeIds", "array-contains", targetId).get(),
          db.collection("events").where("placeIds", "array-contains", targetId).get(),
        ]);

        associations = assocSnap.docs.map(d => withDocumentId(d, "associationId"));
        observations = obsSnap.docs.map(d => withDocumentId(d, "observationId"));
        measurements = measSnap.docs.map(d => withDocumentId(d, "measurementId"));
        events = evSnap.docs.map(d => withDocumentId(d, "eventId"));

        summary = reconstructPlaceSummary({
          placeId: targetId,
          associations,
          observations,
          measurements,
          events,
          asOf,
        });
      }

      let written = false;
      const summaryPath = `${summaryCollection}/${targetId}`;
      const cleanSummary = stripUndefinedDeep(summary);

      if (!dryRun) {
        await db.collection(summaryCollection).doc(targetId).set(cleanSummary);
        written = true;
      }

      return {
        success: true,
        dryRun,
        targetType,
        targetId,
        summaryPath,
        summary: cleanSummary,
        factsRead: {
          associations: associations.length,
          observations: observations.length,
          measurements: measurements.length,
          events: events.length,
        },
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
