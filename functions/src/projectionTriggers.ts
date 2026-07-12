import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { recomputeProjectionSummaryForTarget } from "./projectionSummaryRecompute";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

async function handleFactCreated(data: any) {
  if (!data) return;
  const db = getDb();
  const ownerId = data.ownerId || "";
  const objectIds: string[] = Array.isArray(data.objectIds) ? data.objectIds : [];
  const markerKeys: string[] = Array.isArray(data.markerKeys) ? data.markerKeys : [];
  const placeIds: string[] = Array.isArray(data.placeIds) ? data.placeIds : [];

  const tasks: Promise<any>[] = [];

  const uniqueObjects = Array.from(new Set(objectIds));
  const uniqueMarkers = Array.from(new Set(markerKeys));
  const uniquePlaces = Array.from(new Set(placeIds));

  for (const objectId of uniqueObjects) {
    tasks.push((async () => {
      const { summary } = await recomputeProjectionSummaryForTarget({ db, targetType: "object", targetId: objectId });
      if (summary) {
        const fullSummary = { ...(summary as any), ownerId };
        await db.collection("objectSummaries").doc(objectId).set(fullSummary, { merge: true });
      }
    })());
  }

  for (const markerKey of uniqueMarkers) {
    tasks.push((async () => {
      const { summary } = await recomputeProjectionSummaryForTarget({ db, targetType: "marker", targetId: markerKey });
      if (summary) {
        const fullSummary = { ...(summary as any), ownerId };
        await db.collection("markerSummaries").doc(markerKey).set(fullSummary, { merge: true });
      }
    })());
  }

  for (const placeId of uniquePlaces) {
    tasks.push((async () => {
      const { summary } = await recomputeProjectionSummaryForTarget({ db, targetType: "place", targetId: placeId });
      if (summary) {
        const fullSummary = { ...(summary as any), ownerId };
        await db.collection("placeSummaries").doc(placeId).set(fullSummary, { merge: true });
      }
    })());
  }

  await Promise.all(tasks).catch(err => {
    console.error("Error updating summaries asynchronously:", err);
  });
}

export const onAssociationCreated = onDocumentCreated({
  document: "associations/{id}",
  database: "photo-moukaeritai-work"
}, async (event) => {
  const data = event.data?.data();
  await handleFactCreated(data);
});

export const onObservationCreated = onDocumentCreated({
  document: "observations/{id}",
  database: "photo-moukaeritai-work"
}, async (event) => {
  const data = event.data?.data();
  await handleFactCreated(data);
});

export const onMeasurementCreated = onDocumentCreated({
  document: "measurements/{id}",
  database: "photo-moukaeritai-work"
}, async (event) => {
  const data = event.data?.data();
  await handleFactCreated(data);
});

export const onEventCreated = onDocumentCreated({
  document: "events/{id}",
  database: "photo-moukaeritai-work"
}, async (event) => {
  const data = event.data?.data();
  await handleFactCreated(data);
});
