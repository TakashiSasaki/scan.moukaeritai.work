import { onCall, HttpsError } from "firebase-functions/v2/https";
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

export const recomputeProjectionSummary = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const db = getDb();
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();

  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admin privileges are required.");
  }

  const data = request.data || {};
  const { targetType, targetId } = data;
  const dryRun = data.dryRun !== false; // Default to true

  if (!targetType || !["object", "marker", "place"].includes(targetType)) {
    throw new HttpsError("invalid-argument", 'targetType must be "object", "marker", or "place".');
  }

  if (!targetId || typeof targetId !== "string" || targetId.trim() === "") {
    throw new HttpsError("invalid-argument", "targetId must be a non-empty string.");
  }

  const entityCollection = entityCollectionByTargetType[targetType as keyof typeof entityCollectionByTargetType];
  const summaryCollection = summaryCollectionByTargetType[targetType as keyof typeof summaryCollectionByTargetType];

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

      associations = assocSnap.docs.map(d => ({ ...d.data(), associationId: d.data().associationId ?? d.id }));
      observations = obsSnap.docs.map(d => ({ ...d.data(), observationId: d.data().observationId ?? d.id }));
      measurements = measSnap.docs.map(d => ({ ...d.data(), measurementId: d.data().measurementId ?? d.id }));

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

      associations = assocSnap.docs.map(d => ({ ...d.data(), associationId: d.data().associationId ?? d.id }));
      observations = obsSnap.docs.map(d => ({ ...d.data(), observationId: d.data().observationId ?? d.id }));

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

      associations = assocSnap.docs.map(d => ({ ...d.data(), associationId: d.data().associationId ?? d.id }));
      observations = obsSnap.docs.map(d => ({ ...d.data(), observationId: d.data().observationId ?? d.id }));
      measurements = measSnap.docs.map(d => ({ ...d.data(), measurementId: d.data().measurementId ?? d.id }));
      events = evSnap.docs.map(d => ({ ...d.data(), eventId: d.data().eventId ?? d.id }));

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

    if (!dryRun) {
      await db.collection(summaryCollection).doc(targetId).set(stripUndefinedDeep(summary));
      written = true;
    }

    return {
      success: true,
      dryRun,
      targetType,
      targetId,
      summaryPath,
      summary,
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
});
