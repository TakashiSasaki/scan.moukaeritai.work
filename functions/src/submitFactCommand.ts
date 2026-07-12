import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, GeoPoint } from "firebase-admin/firestore";
import { generateUUIDv7, validateAssociationSemantics, validateDerivedIndexes, buildFactIndexFields } from "@scan/efp-model";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { validateAttach } from "./associationValidation";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);


function getActiveVersion(): string {
  const versionFile = path.join(__dirname, "../vendor/contracts/callable-functions-api/active-version.json");
  const fallbackVersionFile = path.join(process.cwd(), "vendor/contracts/callable-functions-api/active-version.json");
  let p = fs.existsSync(versionFile) ? versionFile : fallbackVersionFile;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return data.version || data.activeVersion;
}


function loadAndParseSchema(fileName: string) {
  const activeVersion = getActiveVersion();
  const pathsToTry = [
    path.join(__dirname, "../vendor/contracts/callable-functions-api", activeVersion, fileName),
    path.join(__dirname, "../../vendor/contracts/callable-functions-api", activeVersion, fileName),
    path.join(process.cwd(), "vendor/contracts/callable-functions-api", activeVersion, fileName),
    path.join(process.cwd(), "functions/vendor/contracts/callable-functions-api", activeVersion, fileName),
  ];
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf8");
        return JSON.parse(content);
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
    const associationSchema = loadAndParseSchema("association-command-data.schema.json");
    const observationSchema = loadAndParseSchema("observation-command-data.schema.json");
    const measurementSchema = loadAndParseSchema("measurement-command-data.schema.json");
    const eventSchema = loadAndParseSchema("event-command-data.schema.json");
    const requestSchema = loadAndParseSchema("submit-fact-command-request.schema.json");
    
    ajv.addSchema(associationSchema, "association-command-data.schema.json");
    ajv.addSchema(observationSchema, "observation-command-data.schema.json");
    ajv.addSchema(measurementSchema, "measurement-command-data.schema.json");
    ajv.addSchema(eventSchema, "event-command-data.schema.json");
    
    validators = {
      request: ajv.compile(requestSchema),
      association: ajv.getSchema("association-command-data.schema.json"),
      observation: ajv.getSchema("observation-command-data.schema.json"),
      measurement: ajv.getSchema("measurement-command-data.schema.json"),
      event: ajv.getSchema("event-command-data.schema.json"),
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

function computeRequestHash(data: any): string {
  const canonicalStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    let result = '{';
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) result += ',';
      result += JSON.stringify(keys[i]) + ':' + canonicalStringify(obj[keys[i]]);
    }
    return result + '}';
  };
  const str = canonicalStringify(data);
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

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

  // 2b. Validate specific logical/semantic invariants
  if (factType === "association") {
    if (!validateAssociationSemantics(data)) {
      throw new HttpsError("invalid-argument", `Semantic validation failed for association ${data.operation}`);
    }
  } else {
    // For other facts, at least ensure derived indexes are consistent if passed
    if (!validateDerivedIndexes(data)) {
      throw new HttpsError("invalid-argument", `Derived index arrays must exactly match participants`);
    }
  }


  // 3. Compute Canonical Hash
  const payloadToHash = {
    factType,
    schemaVersion: 3,
    data
  };
  const requestHash = computeRequestHash(payloadToHash);

  // 4. Validate participants & generate index arrays
  validateParticipants(data.participants);
  const indexFields = buildFactIndexFields(data.participants);
  const participantKeys = indexFields.participantKeys || [];
  const objectIds = indexFields.objectIds || [];
  const markerKeys = indexFields.markerKeys || [];
  const placeIds = indexFields.placeIds || [];
  const deviceIds = indexFields.deviceIds || [];
  const readerIds = indexFields.readerIds || [];
  const userIds = indexFields.userIds || [];

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
      resolvedSubjectId = subjectAssociationId;
    } else if (operation === "replace") {
      resolvedSubjectId = subjectAssociationId;
    }

    const associationProvenance = { ...(provenance || { source: "user_confirmed", confidence: "confirmed" }), actorUid: ownerId };

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
        receivedAt: Timestamp.now()
      },
      provenance: { ...(provenance || {}), actorUid: ownerId },
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
        receivedAt: Timestamp.now()
      },
      provenance: { ...(provenance || {}), actorUid: ownerId },
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
        receivedAt: Timestamp.now()
      },
      provenance: { ...(provenance || {}), actorUid: ownerId },
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
  // owner-scoped command receipt
  const idempotencyRef = db.collection("users").doc(ownerId).collection("factCommands").doc(commandId);

  let returnedFactId = factId;

  await db.runTransaction(async (transaction) => {
    const existingCommand = await transaction.get(idempotencyRef);
    if (existingCommand.exists) {
      const cmdData = existingCommand.data();
      if (cmdData?.factType !== factType) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different factType.");
      }
      if (cmdData?.requestHash !== requestHash) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different payload.");
      }
      // Idempotent hit
      returnedFactId = cmdData.factId as string;
      return;
    }

    // Transactional Association subject reading & safety checks
    if (factType === "association" && (documentToSave.operation === "detach" || documentToSave.operation === "replace")) {
      const subjectAssociationId = documentToSave.subjectAssociationId;
      if (!subjectAssociationId) {
        throw new HttpsError("failed-precondition", `Operation ${documentToSave.operation} requires subjectAssociationId.`);
      }

      // Read subject association inside the transaction
      const subjectRef = db.collection("associations").doc(subjectAssociationId);
      const subjectSnap = await transaction.get(subjectRef);
      if (!subjectSnap.exists) {
        throw new HttpsError("failed-precondition", `Referenced subject association ID "${subjectAssociationId}" was not found.`);
      }

      const subjectData = subjectSnap.data();
      if (subjectData?.ownerId !== ownerId) {
        throw new HttpsError("permission-denied", `Referenced subject association "${subjectAssociationId}" does not belong to you.`);
      }

      // Check for duplicate detaches/replacements
      const duplicateQuery = db.collection("associations")
        .where("subjectAssociationId", "==", subjectAssociationId)
        .where("ownerId", "==", ownerId);
      const duplicateSnap = await transaction.get(duplicateQuery);
      const isAlreadyDetached = duplicateSnap.docs.some(doc => {
        const op = doc.data().operation;
        return op === "detach" || op === "replace";
      });
      if (isAlreadyDetached) {
        throw new HttpsError("failed-precondition", `Referenced association "${subjectAssociationId}" is already detached or replaced.`);
      }

      // Validation matching detach participants with subject
      if (documentToSave.operation === "detach") {
        const subjectKeys = subjectData?.participantKeys || [];
        const incomingKeys = participantKeys;
        const keysMatch = subjectKeys.length === incomingKeys.length && subjectKeys.every((val: string, index: number) => val === incomingKeys[index]);
        if (!keysMatch) {
          throw new HttpsError("failed-precondition", "Participants of the detach command must exactly match those of the subject association.");
        }
      }

      // Checking Object/Marker replace consistency
      if (documentToSave.operation === "replace") {
        const subjectKeys = subjectData?.participantKeys || [];
        const incomingKeys = participantKeys;
        const hasOverlap = incomingKeys.some((k: string) => subjectKeys.includes(k));
        if (!hasOverlap) {
          throw new HttpsError("failed-precondition", "Replace operation must share at least one participant with the subject association being replaced.");
        }

        // Checking old vs new Marker schema integrity
        const subjectParticipants = subjectData?.participants || [];
        const oldMarkerKey = subjectParticipants.find((p: any) => p.ref && p.ref.entityType === 'marker')?.ref.id;
        const newMarkerKey = data.participants.find((p: any) => p.ref && p.ref.entityType === 'marker')?.ref.id;

        if (oldMarkerKey && newMarkerKey && oldMarkerKey !== newMarkerKey) {
          const oldMarkerSnap = await transaction.get(db.collection("markers").doc(oldMarkerKey));
          const newMarkerSnap = await transaction.get(db.collection("markers").doc(newMarkerKey));

          if (oldMarkerSnap.exists && newMarkerSnap.exists) {
            const oldMarkerData = oldMarkerSnap.data();
            const newMarkerData = newMarkerSnap.data();

            if (oldMarkerData?.identityModelVersion !== newMarkerData?.identityModelVersion) {
              throw new HttpsError("failed-precondition", `Marker replacement schema mismatch. Old marker version "${oldMarkerData?.identityModelVersion}" does not match new marker version "${newMarkerData?.identityModelVersion}".`);
            }
            if (oldMarkerData?.canonicalizationVersion !== newMarkerData?.canonicalizationVersion) {
              throw new HttpsError("failed-precondition", `Marker replacement canonicalization mismatch. Old canonicalization "${oldMarkerData?.canonicalizationVersion}" does not match new canonicalization "${newMarkerData?.canonicalizationVersion}".`);
            }
          }
        }
      }
    }

    // Write command receipt
    transaction.set(idempotencyRef, {
      commandId,
      factType,
      factId,
      requestHash,
      ownerId,
      executedAt: Timestamp.now()
    });

    // Write physical Fact document
    const factDocRef = db.collection(collectionName).doc(factId);
    transaction.set(factDocRef, documentToSave);
  });

  console.log(`Successfully processed command "${commandId}" for Fact "${returnedFactId}".`);

  return {
    success: true,
    factId: returnedFactId,
    commandId,
    projectionStatus: "pending"
  };
});
