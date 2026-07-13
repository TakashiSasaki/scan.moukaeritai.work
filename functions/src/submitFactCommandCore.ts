import {
  CANONICAL_JSON_VERSION,
  REQUEST_HASH_VERSION,
  getCanonicalRequestIdentity,
} from "./canonicalRequestIdentity";
import { buildLogicalFact } from "./logicalFactBuilder";

export { CANONICAL_JSON_VERSION, REQUEST_HASH_VERSION };
export const COMMAND_RECEIPT_FIELDS = [
  "commandId",
  "ownerId",
  "factId",
  "factType",
  "callableApiVersion",
  "canonicalJsonVersion",
  "requestHash",
  "requestHashVersion",
  "executedAt",
] as const;
export const REPLAY_COMPARISON_FIELDS = [
  "callableApiVersion",
  "factType",
  "canonicalJsonVersion",
  "requestHash",
  "requestHashVersion",
] as const;

export type CoreErrorCode =
  | "invalid-argument"
  | "failed-precondition"
  | "permission-denied"
  | "internal";
export class SubmitFactCommandCoreError extends Error {
  constructor(
    public code: CoreErrorCode,
    message: string,
  ) {
    super(message);
  }
}
const fail = (code: CoreErrorCode, message: string): never => {
  throw new SubmitFactCommandCoreError(code, message);
};

export interface RuntimeProfile {
  applicationVersion: string;
  callableApiVersion: string;
  efpModelVersion: string;
}
export interface SubmitFactCommandCoreDeps {
  db: any;
  runtimeProfile: RuntimeProfile;
  generateFactId: () => string;
  nowIso: () => string;
  serverTimestamp: () => unknown;
  timestampFromDate: (date: Date) => unknown;
  geoPoint: (latitude: number, longitude: number) => unknown;
  canonicalIdentity?: typeof getCanonicalRequestIdentity;
  logicalFactBuilder?: typeof buildLogicalFact;
}
export interface SubmitFactCommandCoreInput {
  actorUid: string;
  data: any;
}

export async function submitFactCommandCore(
  input: SubmitFactCommandCoreInput,
  deps: SubmitFactCommandCoreDeps,
) {
  const actorUid = input.actorUid;
  const ownerId = actorUid;
  const data = input.data;
  if (!data || typeof data !== "object")
    fail("invalid-argument", "Request payload must be an object.");
  const { commandId, factType } = data;
  if (!commandId || typeof commandId !== "string")
    fail("invalid-argument", "commandId is required and must be a string.");
  if (
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      commandId,
    )
  )
    fail("invalid-argument", "commandId must be a valid UUIDv4.");
  const payloadData = data.data;
  const forbiddenFields = [
    "ownerId",
    "associationId",
    "observationId",
    "measurementId",
    "eventId",
    "participantKeys",
    "objectIds",
    "markerKeys",
    "placeIds",
    "readerIds",
    "deviceIds",
    "userIds",
    "_meta",
  ];
  if (payloadData && typeof payloadData === "object")
    for (const field of forbiddenFields)
      if (field in payloadData)
        fail(
          "invalid-argument",
          `Field '${field}' is not allowed in client request.`,
        );
  const activeApiVersion = deps.runtimeProfile.callableApiVersion;
  const activeEfpVersion = deps.runtimeProfile.efpModelVersion;
  let identity: ReturnType<typeof getCanonicalRequestIdentity>;
  try {
    identity = (deps.canonicalIdentity || getCanonicalRequestIdentity)(
      activeApiVersion,
      factType,
      payloadData,
    );
  } catch (e: any) {
    fail("invalid-argument", `Request canonicalization failed: ${e.message}`);
  }
  const factId = deps.generateFactId();
  const receivedAtStr = deps.nowIso();
  let logicalFact;
  try {
    logicalFact = (deps.logicalFactBuilder || buildLogicalFact)({
      data,
      factId,
      ownerId,
      receivedAt: receivedAtStr,
      recordCreatedAt: receivedAtStr,
      actorUid,
      efpModelVersion: activeEfpVersion,
      callableApiVersion: activeApiVersion,
    });
  } catch (err: any) {
    if (err.message.includes("Logical Fact schema validation failed"))
      fail("internal", "Logical Fact schema validation failed.");
    fail("invalid-argument", err.message);
  }
  const firestoreFact = convertToFirestore(logicalFact, deps);
  let collectionName = "";
  if (factType === "association") collectionName = "associations";
  else if (factType === "observation") collectionName = "observations";
  else if (factType === "measurement") collectionName = "measurements";
  else if (factType === "event") collectionName = "events";
  const db = deps.db;
  const idempotencyRef = db
    .collection("users")
    .doc(ownerId)
    .collection("factCommands")
    .doc(commandId);
  let returnedFactId = factId;
  await db.runTransaction(async (transaction: any) => {
    const existingCommand = await transaction.get(idempotencyRef);
    if (existingCommand.exists) {
      const cmdData = existingCommand.data();
      if (cmdData?.callableApiVersion !== identity.callableApiVersion)
        fail(
          "invalid-argument",
          "Same commandId received with a different callableApiVersion.",
        );
      if (cmdData?.factType !== identity.factType)
        fail(
          "invalid-argument",
          "Same commandId received with a different factType.",
        );
      if (cmdData?.requestHash !== identity.requestHash)
        fail(
          "invalid-argument",
          "Same commandId received with a different payload.",
        );
      if (cmdData?.canonicalJsonVersion !== identity.canonicalJsonVersion)
        fail(
          "invalid-argument",
          "Same commandId received with a different canonical JSON version.",
        );
      if (cmdData?.requestHashVersion !== identity.requestHashVersion)
        fail(
          "invalid-argument",
          "Same commandId received with a different hash version.",
        );
      returnedFactId = cmdData.factId as string;
      return;
    }
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
      if (!docSnap.exists)
        fail(
          "failed-precondition",
          `Participant entity ${eType} ${eId} not found.`,
        );
      if (docSnap.data()?.ownerId !== ownerId)
        fail(
          "permission-denied",
          `Participant entity ${eType} ${eId} does not belong to you.`,
        );
    }
    // subject Association read
    if (factType === "association") {
      const operation = payloadData.operation;
      const subjectAssociationId = payloadData.subjectAssociationId;

      // Check subject association
      if (operation === "detach" || operation === "replace") {
        if (!subjectAssociationId) {
          fail(
            "failed-precondition",
            `Operation ${operation} requires subjectAssociationId.`,
          );
        }
        const subjectRef = db
          .collection("associations")
          .doc(subjectAssociationId);
        const subjectSnap = await transaction.get(subjectRef);
        if (!subjectSnap.exists) {
          fail(
            "failed-precondition",
            `Referenced subject association ID "${subjectAssociationId}" was not found.`,
          );
        }
        const subjectData = subjectSnap.data();
        if (subjectData?.ownerId !== ownerId) {
          fail(
            "permission-denied",
            `Referenced subject association "${subjectAssociationId}" does not belong to you.`,
          );
        }

        const subjectOp = subjectData?.operation;
        if (subjectOp !== "attach") {
          fail(
            "failed-precondition",
            `Subject association "${subjectAssociationId}" has operation "${subjectOp}", which cannot be detached or replaced.`,
          );
        }

        // Check existing detach/replace
        const duplicateQuery = db
          .collection("associations")
          .where("subjectAssociationId", "==", subjectAssociationId)
          .where("ownerId", "==", ownerId);
        const duplicateSnap = await transaction.get(duplicateQuery);
        const isAlreadyDetached = duplicateSnap.docs.some((doc: any) => {
          const op = doc.data().operation;
          return op === "detach" || op === "replace";
        });
        if (isAlreadyDetached) {
          fail(
            "failed-precondition",
            `Referenced association "${subjectAssociationId}" is already detached or replaced.`,
          );
        }

        if (operation === "detach") {
          const subjectKeys = subjectData?.participantKeys || [];
          const incomingKeys = firestoreFact.participantKeys || [];
          const keysMatch =
            subjectKeys.length === incomingKeys.length &&
            subjectKeys.every(
              (val: string, index: number) => val === incomingKeys[index],
            );
          if (!keysMatch) {
            fail(
              "failed-precondition",
              "Participants of the detach command must exactly match those of the subject association.",
            );
          }

          const objectIds = firestoreFact.objectIds || [];
          const markerKeysArr = firestoreFact.markerKeys || [];
          const subObjectIds = subjectData?.objectIds || [];
          const subMarkerKeys = subjectData?.markerKeys || [];

          if (
            objectIds.length !== subObjectIds.length ||
            !objectIds.every((v: string) => subObjectIds.includes(v))
          ) {
            fail(
              "failed-precondition",
              "Object participants must exactly match.",
            );
          }
          if (
            markerKeysArr.length !== subMarkerKeys.length ||
            !markerKeysArr.every((v: string) => subMarkerKeys.includes(v))
          ) {
            fail(
              "failed-precondition",
              "Marker participants must exactly match.",
            );
          }
        }

        if (operation === "replace") {
          const objectIds = firestoreFact.objectIds || [];
          const markerKeysArr = firestoreFact.markerKeys || [];
          const subObjectIds = subjectData?.objectIds || [];
          const subMarkerKeys = subjectData?.markerKeys || [];

          if (
            objectIds.length !== subObjectIds.length ||
            !objectIds.every((v: string) => subObjectIds.includes(v))
          ) {
            fail(
              "failed-precondition",
              "Replace Object participants must exactly match.",
            );
          }
          if (markerKeysArr.length !== 1 || subMarkerKeys.length !== 1) {
            fail(
              "failed-precondition",
              "Replace requires exactly 1 marker in both old and new.",
            );
          }
          if (markerKeysArr[0] === subMarkerKeys[0]) {
            fail(
              "failed-precondition",
              "Replace Marker must be different from the old marker.",
            );
          }

          // Marker replacement has no normative contract constraint requiring identityModelVersion or
          // canonicalizationVersion equality; existence and ownership are validated by participant reads.
          const oldMarkerKey = subMarkerKeys[0];
          const oldMarkerSnap = await transaction.get(
            db.collection("markers").doc(oldMarkerKey),
          );
          if (!oldMarkerSnap.exists) {
            fail(
              "failed-precondition",
              `Old Marker ${oldMarkerKey} not found.`,
            );
          }
          if (oldMarkerSnap.data()?.ownerId !== ownerId) {
            fail(
              "permission-denied",
              `Old Marker ${oldMarkerKey} does not belong to you.`,
            );
          }
        }
      }

      if (operation === "attach") {
        const objectIds = firestoreFact.objectIds || [];
        const markerKeysArr = firestoreFact.markerKeys || [];
        if (objectIds.length !== 1) {
          fail("failed-precondition", "Attach requires exactly 1 Object.");
        }
        if (markerKeysArr.length !== 1) {
          fail("failed-precondition", "Attach requires exactly 1 Marker.");
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
      canonicalJsonVersion: identity.canonicalJsonVersion,
      requestHashVersion: identity.requestHashVersion,
      executedAt: deps.serverTimestamp(),
    });

    transaction.set(db.collection(collectionName).doc(factId), firestoreFact);
  });
  return {
    success: true,
    factId: returnedFactId,
    commandId,
    projectionStatus: "pending",
  };
}

function convertToFirestore(
  logicalFact: any,
  deps: SubmitFactCommandCoreDeps,
): any {
  const result = { ...logicalFact };
  if (result.time) {
    if (result.time.occurredAt)
      result.time.occurredAt = deps.timestampFromDate(
        new Date(result.time.occurredAt),
      );
    if (result.time.observedAt)
      result.time.observedAt = deps.timestampFromDate(
        new Date(result.time.observedAt),
      );
    if (result.time.measuredAt)
      result.time.measuredAt = deps.timestampFromDate(
        new Date(result.time.measuredAt),
      );
    if (result.time.receivedAt)
      result.time.receivedAt = deps.timestampFromDate(
        new Date(result.time.receivedAt),
      );
  }
  if (result.effectiveAt && typeof result.effectiveAt === "string")
    result.effectiveAt = deps.timestampFromDate(new Date(result.effectiveAt));
  if (result._meta && result._meta.recordCreatedAt)
    result._meta.recordCreatedAt = deps.timestampFromDate(
      new Date(result._meta.recordCreatedAt),
    );
  if (result.position) {
    const { latitude, longitude } = result.position;
    result.position.geoPoint = deps.geoPoint(latitude, longitude);
  }
  return result;
}
