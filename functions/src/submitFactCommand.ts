import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, GeoPoint } from "firebase-admin/firestore";
import { generateUUIDv7 } from "@scan/efp-model";
import { recomputeProjectionSummaryForTarget } from "./projectionSummaryRecompute";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

/**
 * Validates the generic structure of a participant reference.
 */
function validateParticipants(participants: any): {
  objectIds: string[];
  markerKeys: string[];
  placeIds: string[];
  deviceIds: string[];
  readerIds: string[];
  userIds: string[];
} {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new HttpsError("invalid-argument", "participants must be a non-empty array.");
  }

  const objectIds: string[] = [];
  const markerKeys: string[] = [];
  const placeIds: string[] = [];
  const deviceIds: string[] = [];
  const readerIds: string[] = [];
  const userIds: string[] = [];

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (!p || typeof p !== "object") {
      throw new HttpsError("invalid-argument", `participants[${i}] must be an object.`);
    }
    if (typeof p.role !== "string" || !p.role) {
      throw new HttpsError("invalid-argument", `participants[${i}].role is required and must be a string.`);
    }
    if (!p.ref || typeof p.ref !== "object") {
      throw new HttpsError("invalid-argument", `participants[${i}].ref is required and must be an object.`);
    }
    const { entityType, id } = p.ref;
    if (typeof entityType !== "string" || !entityType) {
      throw new HttpsError("invalid-argument", `participants[${i}].ref.entityType is required and must be a string.`);
    }
    if (typeof id !== "string" || !id) {
      throw new HttpsError("invalid-argument", `participants[${i}].ref.id is required and must be a string.`);
    }

    // Classify into indexing arrays
    if (entityType === "object") objectIds.push(id);
    else if (entityType === "marker") markerKeys.push(id);
    else if (entityType === "place") placeIds.push(id);
    else if (entityType === "device") deviceIds.push(id);
    else if (entityType === "reader") readerIds.push(id);
    else if (entityType === "user") userIds.push(id);
  }

  return { objectIds, markerKeys, placeIds, deviceIds, readerIds, userIds };
}

/**
 * Validates that all referenced Entities (Objects, Markers, Places) exist and are owned by the active user.
 */
async function verifyParticipantsExistAndOwned(
  db: admin.firestore.Firestore,
  ownerId: string,
  objectIds: string[],
  markerKeys: string[],
  placeIds: string[]
) {
  // Check Objects
  for (const id of objectIds) {
    const snap = await db.collection("objects").doc(id).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", `Referenced Object entity with ID "${id}" was not found.`);
    }
    if (snap.data()?.ownerId !== ownerId) {
      throw new HttpsError("permission-denied", `Referenced Object "${id}" does not belong to you.`);
    }
  }

  // Check Markers
  for (const key of markerKeys) {
    const snap = await db.collection("markers").doc(key).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", `Referenced Marker entity with key "${key}" was not found.`);
    }
    if (snap.data()?.ownerId !== ownerId) {
      throw new HttpsError("permission-denied", `Referenced Marker "${key}" does not belong to you.`);
    }
  }

  // Check Places
  for (const id of placeIds) {
    const snap = await db.collection("places").doc(id).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", `Referenced Place entity with ID "${id}" was not found.`);
    }
    if (snap.data()?.ownerId !== ownerId) {
      throw new HttpsError("permission-denied", `Referenced Place "${id}" does not belong to you.`);
    }
  }
}

/**
 * Triggers recomputation of summary projections for any affected entities.
 */
async function updateAffectedSummaries(
  db: admin.firestore.Firestore,
  ownerId: string,
  objectIds: string[],
  markerKeys: string[],
  placeIds: string[]
) {
  const tasks: Promise<any>[] = [];

  // Deduplicate target sets
  const uniqueObjects = Array.from(new Set(objectIds));
  const uniqueMarkers = Array.from(new Set(markerKeys));
  const uniquePlaces = Array.from(new Set(placeIds));

  for (const objectId of uniqueObjects) {
    tasks.push((async () => {
      const { summary } = await recomputeProjectionSummaryForTarget({ db, targetType: "object", targetId: objectId });
      if (summary) {
        // Enforce ownerId on write
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
    console.error("Error updating summaries in-band:", err);
  });
}

/**
 * Secure, backend-only Callable Function to create an EFP Immutable Fact.
 * Enforces authentication, validation, idempotency, spatial/temporal mappings, and transaction safety.
 */
export const submitFactCommand = onCall(async (request: any) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to execute commands.");
  }

  const { commandId, factType, data } = request.data || {};
  const ownerId = request.auth.uid;

  // 2. Validate generic fields
  if (typeof commandId !== "string" || !commandId) {
    throw new HttpsError("invalid-argument", "commandId is required and must be a string.");
  }
  if (!["association", "observation", "measurement", "event"].includes(factType)) {
    throw new HttpsError("invalid-argument", `Invalid factType "${factType}".`);
  }
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "data payload is required and must be an object.");
  }

  const db = getDb();

  // 3. Enforce Idempotency
  const idempotencyRef = db.collection("factCommands").doc(commandId);
  const existingCommand = await idempotencyRef.get();
  if (existingCommand.exists) {
    const cmdData = existingCommand.data();
    if (cmdData?.ownerId === ownerId) {
      console.log(`Idempotent Command hit for "${commandId}". Returning cached receipt.`);
      return {
        success: true,
        factId: cmdData.factId,
        commandId
      };
    } else {
      throw new HttpsError("permission-denied", "Idempotency collision with another user's command.");
    }
  }

  // 4. Validate participants & generate index arrays
  const { objectIds, markerKeys, placeIds, deviceIds, readerIds, userIds } = validateParticipants(data.participants);
  const participantKeys = Array.from(new Set([
    ...objectIds,
    ...markerKeys,
    ...placeIds,
    ...deviceIds,
    ...readerIds,
    ...userIds
  ])).sort();

  // 5. Verify physical existence of referenced entities (Objects, Markers, Places) and user ownership
  await verifyParticipantsExistAndOwned(db, ownerId, objectIds, markerKeys, placeIds);

  // Generate Fact ID
  const factId = generateUUIDv7();
  let collectionName = "";
  let documentToSave: any = {};

  // 6. Type-specific validation and mappings
  if (factType === "association") {
    collectionName = "associations";
    const { operation, effectiveAt, subjectAssociationId, note } = data;

    if (!["attach", "detach", "replace"].includes(operation)) {
      throw new HttpsError("invalid-argument", "association operation must be 'attach', 'detach', or 'replace'.");
    }
    if (typeof effectiveAt !== "string" || !effectiveAt) {
      throw new HttpsError("invalid-argument", "association effectiveAt timestamp is required.");
    }

    let resolvedSubjectId: string | null = null;
    if (operation === "detach" || operation === "replace") {
      if (typeof subjectAssociationId !== "string" || !subjectAssociationId) {
        throw new HttpsError("failed-precondition", `Operation '${operation}' requires a valid non-empty 'subjectAssociationId'.`);
      }
      // Check if the subject association exists and belongs to the owner
      const subjectSnap = await db.collection("associations").doc(subjectAssociationId).get();
      if (!subjectSnap.exists) {
        throw new HttpsError("failed-precondition", `Referenced subject association ID "${subjectAssociationId}" was not found.`);
      }
      if (subjectSnap.data()?.ownerId !== ownerId) {
        throw new HttpsError("permission-denied", `Referenced subject association "${subjectAssociationId}" does not belong to you.`);
      }
      resolvedSubjectId = subjectAssociationId;
    }

    documentToSave = {
      associationId: factId,
      ownerId,
      operation,
      effectiveAt: Timestamp.fromDate(new Date(effectiveAt)),
      subjectAssociationId: resolvedSubjectId,
      participants: data.participants,
      note: note || null,
      _meta: {
        schemaVersion: "3.0.0",
        createdAt: Timestamp.now(),
        createdBy: ownerId
      }
    };

  } else if (factType === "observation") {
    collectionName = "observations";
    const { observationType, time, provenance, source, note, payload } = data;

    if (typeof observationType !== "string" || !observationType) {
      throw new HttpsError("invalid-argument", "observationType must be a non-empty string.");
    }
    if (!time || typeof time !== "object" || typeof time.observedAt !== "string" || !time.observedAt) {
      throw new HttpsError("invalid-argument", "time.observedAt is required and must be an RFC 3339 string.");
    }
    if (!provenance || typeof provenance !== "object" || typeof provenance.source !== "string" || typeof provenance.confidence !== "string") {
      throw new HttpsError("invalid-argument", "provenance must be an object with source and confidence strings.");
    }

    documentToSave = {
      observationId: factId,
      ownerId,
      observationType,
      time: {
        observedAt: Timestamp.fromDate(new Date(time.observedAt)),
        receivedAt: Timestamp.fromDate(new Date(time.receivedAt || new Date().toISOString()))
      },
      provenance,
      participants: data.participants,
      source: source || null,
      note: note || null,
      payload: payload || null,
      _meta: {
        schemaVersion: "3.0.0",
        createdAt: Timestamp.now(),
        createdBy: ownerId
      }
    };

  } else if (factType === "measurement") {
    collectionName = "measurements";
    const { measurementType, time, provenance, position, place, signal, note } = data;

    if (typeof measurementType !== "string" || !measurementType) {
      throw new HttpsError("invalid-argument", "measurementType must be a non-empty string.");
    }
    if (!time || typeof time !== "object" || typeof time.measuredAt !== "string" || !time.measuredAt) {
      throw new HttpsError("invalid-argument", "time.measuredAt is required and must be an RFC 3339 string.");
    }
    if (!provenance || typeof provenance !== "object" || typeof provenance.source !== "string" || typeof provenance.confidence !== "string") {
      throw new HttpsError("invalid-argument", "provenance must be an object with source and confidence strings.");
    }

    let mappedPosition: any = null;
    if (position && typeof position === "object") {
      const { latitude, longitude, altitude, accuracyMeters } = position;
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new HttpsError("invalid-argument", "position latitude and longitude must be numbers.");
      }
      mappedPosition = {
        latitude,
        longitude,
        geoPoint: new GeoPoint(latitude, longitude),
        altitude: typeof altitude === "number" ? altitude : null,
        accuracyMeters: typeof accuracyMeters === "number" ? accuracyMeters : null
      };
    }

    documentToSave = {
      measurementId: factId,
      ownerId,
      measurementType,
      time: {
        measuredAt: Timestamp.fromDate(new Date(time.measuredAt)),
        receivedAt: Timestamp.fromDate(new Date(time.receivedAt || new Date().toISOString()))
      },
      provenance,
      participants: data.participants,
      position: mappedPosition,
      place: place || null,
      signal: signal || null,
      note: note || null,
      _meta: {
        schemaVersion: "3.0.0",
        createdAt: Timestamp.now(),
        createdBy: ownerId
      }
    };

  } else if (factType === "event") {
    collectionName = "events";
    const { eventType, time, provenance, note } = data;

    if (typeof eventType !== "string" || !eventType) {
      throw new HttpsError("invalid-argument", "eventType must be a non-empty string.");
    }
    if (!time || typeof time !== "object" || typeof time.occurredAt !== "string" || !time.occurredAt) {
      throw new HttpsError("invalid-argument", "time.occurredAt is required and must be an RFC 3339 string.");
    }
    if (!provenance || typeof provenance !== "object" || typeof provenance.source !== "string" || typeof provenance.confidence !== "string") {
      throw new HttpsError("invalid-argument", "provenance must be an object with source and confidence strings.");
    }

    documentToSave = {
      eventId: factId,
      ownerId,
      eventType,
      time: {
        occurredAt: Timestamp.fromDate(new Date(time.occurredAt)),
        receivedAt: Timestamp.fromDate(new Date(time.receivedAt || new Date().toISOString()))
      },
      provenance,
      participants: data.participants,
      note: note || null,
      _meta: {
        schemaVersion: "3.0.0",
        createdAt: Timestamp.now(),
        createdBy: ownerId
      }
    };
  }

  // Inject indexing fields
  documentToSave.objectIds = objectIds;
  documentToSave.markerKeys = markerKeys;
  documentToSave.placeIds = placeIds;
  documentToSave.deviceIds = deviceIds;
  documentToSave.readerIds = readerIds;
  documentToSave.userIds = userIds;
  documentToSave.participantKeys = participantKeys;

  // 7. Write Fact and Command receipt in a single atomic transaction
  await db.runTransaction(async (transaction) => {
    // Write command receipt first
    transaction.set(idempotencyRef, {
      commandId,
      factType,
      factId,
      ownerId,
      executedAt: Timestamp.now()
    });

    // Write physical Fact document
    const factDocRef = db.collection(collectionName).doc(factId);
    transaction.set(factDocRef, documentToSave);
  });

  console.log(`Successfully created immutable Fact "${factId}" of type "${factType}".`);

  // 8. Recompute summary projections in-band to ensure read-after-write consistency
  await updateAffectedSummaries(db, ownerId, objectIds, markerKeys, placeIds);

  return {
    success: true,
    factId,
    commandId
  };
});
