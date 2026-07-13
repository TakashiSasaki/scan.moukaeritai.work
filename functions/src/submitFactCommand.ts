import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore, Timestamp, GeoPoint } from "firebase-admin/firestore";
import { generateUUIDv7 } from "@scan/efp-model";
import { getCanonicalRequestIdentity } from "./canonicalRequestIdentity";
import { buildLogicalFact } from "./logicalFactBuilder";
import * as fs from "fs";
import * as path from "path";

const appletConfig = {
  firestoreDatabaseId: "photo-moukaeritai-work"
};

function getDb() {
  return getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
}

function getActiveApiVersion(): string {
  const versionFile = path.join(__dirname, "../vendor/contracts/callable-functions-api/active-version.json");
  const fallbackVersionFile = path.join(process.cwd(), "vendor/contracts/callable-functions-api/active-version.json");
  const p = fs.existsSync(versionFile) ? versionFile : fallbackVersionFile;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  return data.version || data.activeVersion;
}

function getActiveEfpVersion(): string {
  const file = path.join(__dirname, "../../contracts/profiles/current-application.json");
  const fallbackFile = path.join(process.cwd(), "contracts/profiles/current-application.json");
  const p = fs.existsSync(file) ? file : fallbackFile;
  const profile = JSON.parse(fs.readFileSync(p, "utf8"));
  return profile.contracts["efp-model"];
}

export const submitFactCommand = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated to submit a Fact.");
  }
  const actorUid = request.auth.uid;
  const ownerId = request.auth.uid; // ownerId must be actorUid

  const { data } = request;
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Request payload must be an object.");
  }

  const { commandId, factType } = data;
  if (!commandId || typeof commandId !== "string") {
    throw new HttpsError("invalid-argument", "commandId is required and must be a string.");
  }

  // commandId MUST be UUIDv4
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(commandId)) {
    throw new HttpsError("invalid-argument", "commandId must be a valid UUIDv4.");
  }

  const payloadData = data.data;

  // Strict rejection of backend fields in client payload
  const forbiddenFields = [
    "ownerId", "associationId", "observationId", "measurementId", "eventId",
    "participantKeys", "objectIds", "markerKeys", "placeIds", "readerIds",
    "deviceIds", "userIds", "_meta"
  ];
  if (payloadData && typeof payloadData === "object") {
    for (const field of forbiddenFields) {
      if (field in payloadData) {
        throw new HttpsError("invalid-argument", `Field '${field}' is not allowed in client request.`);
      }
    }
  }

  const activeApiVersion = getActiveApiVersion();
  const activeEfpVersion = getActiveEfpVersion();

  let identity;
  try {
    identity = getCanonicalRequestIdentity(activeApiVersion, factType, payloadData);
  } catch (e: any) {
    throw new HttpsError("invalid-argument", `Request canonicalization failed: ${e.message}`);
  }
  
  const factId = generateUUIDv7();
  const receivedAtStr = new Date().toISOString();
  
  let logicalFact;
  try {
    logicalFact = buildLogicalFact({
      data,
      factId,
      ownerId,
      receivedAt: receivedAtStr,
      recordCreatedAt: receivedAtStr,
      actorUid,
      efpModelVersion: activeEfpVersion,
      callableApiVersion: activeApiVersion
    });
  } catch (err: any) {
    if (err.message.includes("Logical Fact schema validation failed")) {
       throw new HttpsError("internal", "Logical Fact schema validation failed.");
    }
    throw new HttpsError("invalid-argument", err.message);
  }

  // Convert RFC3339 string and position format to Firestore formats
  const firestoreFact = convertToFirestore(logicalFact);

  const db = getDb();
  let collectionName = "";
  if (factType === "association") collectionName = "associations";
  else if (factType === "observation") collectionName = "observations";
  else if (factType === "measurement") collectionName = "measurements";
  else if (factType === "event") collectionName = "events";

  const idempotencyRef = db.collection("users").doc(ownerId).collection("factCommands").doc(commandId);

  let returnedFactId = factId;

  await db.runTransaction(async (transaction) => {
    // 1. receipt read
    const existingCommand = await transaction.get(idempotencyRef);
    if (existingCommand.exists) {
      const cmdData = existingCommand.data();
      if (cmdData?.callableApiVersion !== identity.callableApiVersion) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different callableApiVersion.");
      }
      if (cmdData?.factType !== identity.factType) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different factType.");
      }
      if (cmdData?.requestHash !== identity.requestHash) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different payload.");
      }
      if (cmdData?.requestHashVersion !== identity.requestHashVersion) {
        throw new HttpsError("invalid-argument", "Same commandId received with a different hash version.");
      }
      returnedFactId = cmdData.factId as string;
      return;
    }

    
    // 2. participant Entity reads
    const participants = firestoreFact.participants || [];
    for (const p of participants) {
      const eType = p.ref.entityType;
      const eId = p.ref.id;
      let eCol = "";
      if (eType === "object") eCol = "objects";
      else if (eType === "marker") eCol = "markers";
      else if (eType === "place") eCol = "places";
      else continue;

      const docSnap = await transaction.get(db.collection(eCol).doc(eId));
      if (!docSnap.exists) {
        throw new HttpsError("failed-precondition", `Participant entity ${eType} ${eId} not found.`);
      }
      if (docSnap.data()?.ownerId !== ownerId) {
        throw new HttpsError("permission-denied", `Participant entity ${eType} ${eId} does not belong to you.`);
      }
    }

    // subject Association read
    if (factType === "association") {
      const operation = payloadData.operation;
      const subjectAssociationId = payloadData.subjectAssociationId;


      // Check subject association
      if (operation === "detach" || operation === "replace") {
        if (!subjectAssociationId) {
          throw new HttpsError("failed-precondition", `Operation ${operation} requires subjectAssociationId.`);
        }
        const subjectRef = db.collection("associations").doc(subjectAssociationId);
        const subjectSnap = await transaction.get(subjectRef);
        if (!subjectSnap.exists) {
          throw new HttpsError("failed-precondition", `Referenced subject association ID "${subjectAssociationId}" was not found.`);
        }
        const subjectData = subjectSnap.data();
        if (subjectData?.ownerId !== ownerId) {
          throw new HttpsError("permission-denied", `Referenced subject association "${subjectAssociationId}" does not belong to you.`);
        }

        const subjectOp = subjectData?.operation;
        if (subjectOp !== "attach" && subjectOp !== "replace") {
          throw new HttpsError("failed-precondition", `Subject association "${subjectAssociationId}" has operation "${subjectOp}", which cannot be detached or replaced.`);
        }

        // Check existing detach/replace
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

        if (operation === "detach") {
          const subjectKeys = subjectData?.participantKeys || [];
          const incomingKeys = firestoreFact.participantKeys || [];
          const keysMatch = subjectKeys.length === incomingKeys.length && subjectKeys.every((val: string, index: number) => val === incomingKeys[index]);
          if (!keysMatch) {
            throw new HttpsError("failed-precondition", "Participants of the detach command must exactly match those of the subject association.");
          }
          
          const objectIds = firestoreFact.objectIds || [];
          const markerKeysArr = firestoreFact.markerKeys || [];
          const subObjectIds = subjectData?.objectIds || [];
          const subMarkerKeys = subjectData?.markerKeys || [];
          
          if (objectIds.length !== subObjectIds.length || !objectIds.every((v: string) => subObjectIds.includes(v))) {
             throw new HttpsError("failed-precondition", "Object participants must exactly match.");
          }
          if (markerKeysArr.length !== subMarkerKeys.length || !markerKeysArr.every((v: string) => subMarkerKeys.includes(v))) {
             throw new HttpsError("failed-precondition", "Marker participants must exactly match.");
          }
        }

        if (operation === "replace") {
          const objectIds = firestoreFact.objectIds || [];
          const markerKeysArr = firestoreFact.markerKeys || [];
          const subObjectIds = subjectData?.objectIds || [];
          const subMarkerKeys = subjectData?.markerKeys || [];
          
          if (objectIds.length !== subObjectIds.length || !objectIds.every((v: string) => subObjectIds.includes(v))) {
             throw new HttpsError("failed-precondition", "Replace Object participants must exactly match.");
          }
          if (markerKeysArr.length !== 1 || subMarkerKeys.length !== 1) {
             throw new HttpsError("failed-precondition", "Replace requires exactly 1 marker in both old and new.");
          }
          if (markerKeysArr[0] === subMarkerKeys[0]) {
             throw new HttpsError("failed-precondition", "Replace Marker must be different from the old marker.");
          }
          
          // Schema integrity - normatively checking Marker versions since contract 2.0
          const oldMarkerKey = subMarkerKeys[0];
          const newMarkerKey = markerKeysArr[0];
          const oldMarkerSnap = await transaction.get(db.collection("markers").doc(oldMarkerKey));
          const newMarkerSnap = await transaction.get(db.collection("markers").doc(newMarkerKey));
          if (oldMarkerSnap.exists && newMarkerSnap.exists) {
            const oldMarkerData = oldMarkerSnap.data();
            const newMarkerData = newMarkerSnap.data();
            if (oldMarkerData?.identityModelVersion !== newMarkerData?.identityModelVersion) {
              throw new HttpsError("failed-precondition", `Marker replacement schema mismatch.`);
            }
            if (oldMarkerData?.canonicalizationVersion !== newMarkerData?.canonicalizationVersion) {
              throw new HttpsError("failed-precondition", `Marker replacement canonicalization mismatch.`);
            }
          }
        }
      }
      
      if (operation === "attach") {
         const objectIds = firestoreFact.objectIds || [];
         const markerKeysArr = firestoreFact.markerKeys || [];
         if (objectIds.length !== 1) {
             throw new HttpsError("failed-precondition", "Attach requires exactly 1 Object.");
         }
         if (markerKeysArr.length !== 1) {
             throw new HttpsError("failed-precondition", "Attach requires exactly 1 Marker.");
         }
      }
    }

    // 6. Fact write & receipt write
    transaction.set(idempotencyRef, {
      commandId,
      ownerId,
      factId,
      factType,
      callableApiVersion: identity.callableApiVersion,
      requestHash: identity.requestHash,
      requestHashVersion: identity.requestHashVersion,
      executedAt: Timestamp.now()
    });

    transaction.set(db.collection(collectionName).doc(factId), firestoreFact);
  });

  return {
    success: true,
    factId: returnedFactId,
    commandId,
    projectionStatus: "pending"
  };
});

function convertToFirestore(logicalFact: any): any {
  const result = { ...logicalFact };
  if (result.time) {
    if (result.time.occurredAt) result.time.occurredAt = Timestamp.fromDate(new Date(result.time.occurredAt));
    if (result.time.observedAt) result.time.observedAt = Timestamp.fromDate(new Date(result.time.observedAt));
    if (result.time.measuredAt) result.time.measuredAt = Timestamp.fromDate(new Date(result.time.measuredAt));
    if (result.time.receivedAt) result.time.receivedAt = Timestamp.fromDate(new Date(result.time.receivedAt));
  }
  if (result.effectiveAt && typeof result.effectiveAt === "string") result.effectiveAt = Timestamp.fromDate(new Date(result.effectiveAt));
  if (result._meta && result._meta.recordCreatedAt) {
    result._meta.recordCreatedAt = Timestamp.fromDate(new Date(result._meta.recordCreatedAt));
  }
  if (result.position) {
     const { latitude, longitude } = result.position;
     result.position.geoPoint = new GeoPoint(latitude, longitude);
  }
  return result;
}
