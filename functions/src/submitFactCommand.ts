import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, GeoPoint } from "firebase-admin/firestore";
import { generateUUIDv7 } from "@scan/efp-model";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as fs from "fs";
import * as path from "path";
import { validateAttach, validateDetach, validateReplace } from "./associationValidation";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function loadAndCompileSchema(fileName: string) {
  const pathsToTry = [
    path.join(__dirname, "../vendor/contracts/callable-functions-api/1.1.1", fileName),
    path.join(__dirname, "../../vendor/contracts/callable-functions-api/1.1.1", fileName),
    path.join(process.cwd(), "vendor/contracts/callable-functions-api/1.1.1", fileName),
    path.join(process.cwd(), "functions/vendor/contracts/callable-functions-api/1.1.1", fileName),
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf8");
        const schema = JSON.parse(content);
        return ajv.compile(schema);
      } catch (err: any) {
        console.error(`Failed parsing schema from path ${p}: ${err.message}`);
      }
    }
  }
  throw new Error(`Schema file not found in search paths: ${fileName}. Searched paths: ${JSON.stringify(pathsToTry)}`);
}

let validators: Record<string, any> | null = null;

function getValidators() {
  if (!validators) {
    validators = {
      request: loadAndCompileSchema("submit-fact-command-request.schema.json"),
      association: loadAndCompileSchema("association-command-data.schema.json"),
      observation: loadAndCompileSchema("observation-command-data.schema.json"),
      measurement: loadAndCompileSchema("measurement-command-data.schema.json"),
      event: loadAndCompileSchema("event-command-data.schema.json"),
    };
  }
  return validators;
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
 * Secure, backend-only Callable Function to create an EFP Immutable Fact.
 * Enforces authentication, validation, idempotency, spatial/temporal mappings, and transaction safety.
 */
export const submitFactCommand = onCall(async (request: any) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to execute commands.");
  }

  const ownerId = request.auth.uid;
  const db = getDb();

  // Validate the whole request against the request schema first
  const reqValidators = getValidators();
  const isReqValid = reqValidators.request(request.data);
  if (!isReqValid) {
    const errorsText = ajv.errorsText(reqValidators.request.errors);
    throw new HttpsError("invalid-argument", `Request schema validation failed: ${errorsText}`);
  }

  const { commandId, factType, data } = request.data || {};

  // 2. Validate the specific data block against its corresponding schema
  const dataValidator = reqValidators[factType];
  const isDataValid = dataValidator(data);
  if (!isDataValid) {
    const errorsText = ajv.errorsText(dataValidator.errors);
    throw new HttpsError("invalid-argument", `Data payload schema validation failed for ${factType}: ${errorsText}`);
  }

  // 3. Enforce Idempotency
  const idempotencyRef = db.collection("factCommands").doc(commandId);
  const existingCommand = await idempotencyRef.get();
  if (existingCommand.exists) {
    const cmdData = existingCommand.data();
    if (cmdData && cmdData.ownerId === ownerId) {
      console.log(`Idempotent Command hit for "${commandId}". Returning cached receipt.`);
      return {
        success: true,
        factId: cmdData.factId as string,
        commandId,
        projectionStatus: "pending"
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

  const commonMeta = {
    recordCreatedAt: Timestamp.now(),
    recordUpdatedAt: Timestamp.now(),
    recordCreatedBy: ownerId,
    recordUpdatedBy: ownerId,
    schemaVersion: 3
  };

  // 6. Type-specific logical mappings and omission of undefined optional fields
  if (factType === "association") {
    collectionName = "associations";
    const { operation, effectiveAt, subjectAssociationId, note, provenance } = data;

    let resolvedSubjectId: string | null = null;
    if (operation === "attach") {
      validateAttach(data);
    } else if (operation === "detach") {
      await validateDetach(db, ownerId, subjectAssociationId);
      resolvedSubjectId = subjectAssociationId;
    } else if (operation === "replace") {
      await validateReplace(db, ownerId, subjectAssociationId);
      resolvedSubjectId = subjectAssociationId;
    }

    const associationProvenance = provenance || {
      source: "user_confirmed",
      confidence: "confirmed",
      actorUid: ownerId
    };

    documentToSave = {
      associationId: factId,
      ownerId,
      operation,
      effectiveAt: Timestamp.fromDate(new Date(effectiveAt)),
      participants: data.participants,
      provenance: associationProvenance,
      _meta: commonMeta
    };

    if (resolvedSubjectId !== null && resolvedSubjectId !== undefined) {
      documentToSave.subjectAssociationId = resolvedSubjectId;
    }
    if (note !== undefined && note !== null) {
      documentToSave.note = note;
    }

  } else if (factType === "observation") {
    collectionName = "observations";
    const { observationType, time, provenance, source, note, payload } = data;

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
      _meta: commonMeta
    };

    if (source !== undefined && source !== null) {
      documentToSave.source = source;
    }
    if (note !== undefined && note !== null) {
      documentToSave.note = note;
    }
    if (payload !== undefined && payload !== null) {
      documentToSave.payload = payload;
    }

  } else if (factType === "measurement") {
    collectionName = "measurements";
    const { measurementType, time, provenance, position, place, signal, note } = data;

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
      _meta: commonMeta
    };

    if (position !== undefined && position !== null) {
      const { latitude, longitude, altitude, accuracyMeters } = position;
      const mappedPosition: any = {
        latitude,
        longitude,
        geoPoint: new GeoPoint(latitude, longitude)
      };
      if (altitude !== undefined && altitude !== null) {
        mappedPosition.altitude = altitude;
      }
      if (accuracyMeters !== undefined && accuracyMeters !== null) {
        mappedPosition.accuracyMeters = accuracyMeters;
      }
      documentToSave.position = mappedPosition;
    }

    if (place !== undefined && place !== null) {
      documentToSave.place = place;
    }
    if (signal !== undefined && signal !== null) {
      documentToSave.signal = signal;
    }
    if (note !== undefined && note !== null) {
      documentToSave.note = note;
    }

  } else if (factType === "event") {
    collectionName = "events";
    const { eventType, time, provenance, note } = data;

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
      _meta: commonMeta
    };

    if (note !== undefined && note !== null) {
      documentToSave.note = note;
    }
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

  return {
    success: true,
    factId,
    commandId,
    projectionStatus: "pending"
  };
});
