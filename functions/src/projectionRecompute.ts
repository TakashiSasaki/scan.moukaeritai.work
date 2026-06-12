import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

import {
  reconstructObjectSummary,
  reconstructMarkerSummary,
  reconstructPlaceSummary,
} from "../../src/lib/projectionReconstruction";
import type {
  AssociationDoc,
  MeasurementDoc,
  ObservationDoc,
  EventDoc,
  Timestamp as ClientTimestamp,
} from "../../src/types/entityFactProjection";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

export const recomputeProjectionSummary = onCall(async (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const db = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "You do not have administrative privileges.");
  }

  const data = request.data || {};
  const { targetType, targetId } = data;
  const dryRun = typeof data.dryRun === "boolean" ? data.dryRun : true;

  if (!targetType || !["object", "marker", "place"].includes(targetType)) {
    throw new HttpsError("invalid-argument", "targetType must be one of: 'object', 'marker', 'place'.");
  }

  if (!targetId || typeof targetId !== "string") {
    throw new HttpsError("invalid-argument", "targetId must be a non-empty string.");
  }

  const collectionNames = {
    object: "objects",
    marker: "markers",
    place: "places",
  };

  const targetCollection = collectionNames[targetType as keyof typeof collectionNames];

  try {
    const targetDocRef = db.collection(targetCollection).doc(targetId);
    const targetDocSnap = await targetDocRef.get();

    if (!targetDocSnap.exists) {
      throw new HttpsError("not-found", "Target entity not found.");
    }
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error fetching target entity:", error);
    throw new HttpsError("internal", "Failed to fetch target entity.");
  }

  const asOf = admin.firestore.Timestamp.now() as unknown as ClientTimestamp;
  const factsRead = {
    associations: 0,
    observations: 0,
    measurements: 0,
    events: 0,
  };

  let summary: any;
  let summaryPath: string;

  try {
    if (targetType === "object") {
      summaryPath = `objectSummaries/${targetId}`;
      const [assocSnap, measSnap, obsSnap] = await Promise.all([
        db.collection("associations").where("objectIds", "array-contains", targetId).get(),
        db.collection("measurements").where("objectIds", "array-contains", targetId).get(),
        db.collection("observations").where("objectIds", "array-contains", targetId).get(),
      ]);

      const associations = assocSnap.docs.map(doc => {
        const docData = doc.data();
        return { associationId: docData.associationId ?? doc.id, ...docData } as unknown as AssociationDoc;
      });
      const measurements = measSnap.docs.map(doc => {
        const docData = doc.data();
        return { measurementId: docData.measurementId ?? doc.id, ...docData } as unknown as MeasurementDoc;
      });
      const observations = obsSnap.docs.map(doc => {
        const docData = doc.data();
        return { observationId: docData.observationId ?? doc.id, ...docData } as unknown as ObservationDoc;
      });

      factsRead.associations = associations.length;
      factsRead.measurements = measurements.length;
      factsRead.observations = observations.length;

      summary = reconstructObjectSummary({
        objectId: targetId,
        associations,
        measurements,
        observations,
        asOf,
      });

    } else if (targetType === "marker") {
      summaryPath = `markerSummaries/${targetId}`;
      const [assocSnap, obsSnap] = await Promise.all([
        db.collection("associations").where("markerKeys", "array-contains", targetId).get(),
        db.collection("observations").where("markerKeys", "array-contains", targetId).get(),
      ]);

      const associations = assocSnap.docs.map(doc => {
        const docData = doc.data();
        return { associationId: docData.associationId ?? doc.id, ...docData } as unknown as AssociationDoc;
      });
      const observations = obsSnap.docs.map(doc => {
        const docData = doc.data();
        return { observationId: docData.observationId ?? doc.id, ...docData } as unknown as ObservationDoc;
      });

      factsRead.associations = associations.length;
      factsRead.observations = observations.length;

      summary = reconstructMarkerSummary({
        markerKey: targetId,
        associations,
        observations,
        asOf,
      });

    } else { // targetType === "place"
      summaryPath = `placeSummaries/${targetId}`;
      const [assocSnap, obsSnap, measSnap, evtSnap] = await Promise.all([
        db.collection("associations").where("placeIds", "array-contains", targetId).get(),
        db.collection("observations").where("placeIds", "array-contains", targetId).get(),
        db.collection("measurements").where("placeIds", "array-contains", targetId).get(),
        db.collection("events").where("placeIds", "array-contains", targetId).get(),
      ]);

      const associations = assocSnap.docs.map(doc => {
        const docData = doc.data();
        return { associationId: docData.associationId ?? doc.id, ...docData } as unknown as AssociationDoc;
      });
      const observations = obsSnap.docs.map(doc => {
        const docData = doc.data();
        return { observationId: docData.observationId ?? doc.id, ...docData } as unknown as ObservationDoc;
      });
      const measurements = measSnap.docs.map(doc => {
        const docData = doc.data();
        return { measurementId: docData.measurementId ?? doc.id, ...docData } as unknown as MeasurementDoc;
      });
      const events = evtSnap.docs.map(doc => {
        const docData = doc.data();
        return { eventId: docData.eventId ?? doc.id, ...docData } as unknown as EventDoc;
      });

      factsRead.associations = associations.length;
      factsRead.observations = observations.length;
      factsRead.measurements = measurements.length;
      factsRead.events = events.length;

      summary = reconstructPlaceSummary({
        placeId: targetId,
        associations,
        observations,
        measurements,
        events,
        asOf,
      });
    }
  } catch (error: any) {
    console.error("Error computing summary:", error);
    throw new HttpsError("internal", "Failed to compute projection summary.");
  }

  let written = false;

  if (!dryRun) {
    try {
      // Use Admin SDK to write to summary collection using set()
      const summaryCol = summaryPath.split('/')[0];
      await db.collection(summaryCol).doc(targetId).set(summary);
      written = true;
    } catch (error: any) {
      console.error("Error writing summary:", error);
      throw new HttpsError("internal", "Failed to write projection summary.");
    }
  }

  return {
    success: true,
    dryRun,
    targetType,
    targetId,
    summaryPath,
    summary,
    factsRead,
    written,
  };
});
