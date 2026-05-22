import { v7 as uuidv7 } from 'uuid';
import {
  serverTimestamp,
  FieldValue,
  Timestamp,
  runTransaction,
  doc,
  Firestore,
} from 'firebase/firestore';
import type {
  IdentifierObservationRecord,
  ObservationVisibility,
  ObservationLocation,
  IdentifierRecord,
} from '../types';

/**
 * Normal user-created observations must use UUIDv7.
 * Imported/synthetic observations must use deterministic IDs in later phases.
 */
export function buildObservationId(): string {
  return uuidv7();
}

/**
 * Types specifically constrained for direct client-created observations.
 * Rules restrict the source and observationType for user observations.
 */
export type UserObservationSource = 'nfc' | 'qr' | 'manual' | 'barcode' | 'camera';
export type UserObservationType = 'sighting' | 'scan';

/**
 * Local write payload type for User Identifier Observations.
 * This allows `FieldValue` (like serverTimestamp()) for request.time-bound fields
 * while keeping the rest of the shape strict.
 */
export type UserIdentifierObservationWrite = Omit<
  IdentifierObservationRecord,
  'receivedAt' | 'createdAt' | 'observerKind'
> & {
  observerKind: 'user';
  receivedAt: FieldValue;
  createdAt: FieldValue;
  // observerDeviceId is explicitly excluded for user observations
};

export interface BuildUserObservationInput {
  observationId: string;
  identifierKey: string;
  observedAt: Timestamp;
  source: UserObservationSource;
  observationType: UserObservationType;
  observerUid: string;
  observerIsAnonymous?: boolean;
  objectId?: string;
  placeLabel?: string;
  location?: ObservationLocation;
  note?: string;
  metadata?: Record<string, unknown>;
  visibility?: ObservationVisibility;
  schemaVersion?: number;
}

/**
 * Builds the direct client-created observation payload.
 * Enforces rules constraints (observerKind, allowed sources, etc.).
 */
export function buildUserIdentifierObservationWrite(
  input: BuildUserObservationInput
): UserIdentifierObservationWrite {
  const payload: UserIdentifierObservationWrite = {
    observationId: input.observationId,
    identifierKey: input.identifierKey,
    observerKind: 'user',
    observerUid: input.observerUid,
    observedAt: input.observedAt,
    receivedAt: serverTimestamp(), // Rules require receivedAt == request.time
    createdAt: serverTimestamp(),  // Rules require createdAt == request.time
    source: input.source,
    observationType: input.observationType,
  };

  if (input.observerIsAnonymous !== undefined) {
    payload.observerIsAnonymous = input.observerIsAnonymous;
  }
  if (input.objectId) {
    payload.objectId = input.objectId;
  }
  if (input.placeLabel) {
    payload.placeLabel = input.placeLabel;
  }
  if (input.location) {
    payload.location = input.location;
  }
  if (input.note) {
    payload.note = input.note;
  }
  if (input.metadata) {
    payload.metadata = input.metadata;
  }
  if (input.visibility) {
    payload.visibility = input.visibility;
  } else {
    // Default to conservative visibility
    payload.visibility = 'private';
  }
  if (input.schemaVersion !== undefined) {
    payload.schemaVersion = input.schemaVersion;
  }

  return payload;
}

/**
 * Local write payload type for Identifiers, allowing FieldValues for timestamps.
 */
export type IdentifierRecordWrite = Omit<
  IdentifierRecord,
  'createdAt' | 'updatedAt' | 'firstObservedAt' | 'lastObservedAt' | 'lastSeenAt'
> & {
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
  firstObservedAt?: FieldValue | Timestamp;
  lastObservedAt?: FieldValue | Timestamp;
  lastSeenAt?: FieldValue | Timestamp;
};

export interface BuildObservedUnassignedIdentifierInput {
  identifierKey: string;
  ownerId: string; // The current user UID
  kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
  scheme: string;
  canonicalValue: string;
  rawValue?: string;
  label?: string;
  observationId: string;
  observedAt: Timestamp;
  source: UserObservationSource;
}

/**
 * Builds the initial identifiers/{identifierKey} document for an unknown identifier.
 */
export function buildObservedUnassignedIdentifierRecord(
  input: BuildObservedUnassignedIdentifierInput
): IdentifierRecordWrite {
  return {
    identifierKey: input.identifierKey,
    ownerId: input.ownerId,
    kind: input.kind,
    scheme: input.scheme,
    canonicalValue: input.canonicalValue,
    rawValue: input.rawValue,
    status: 'unassigned',
    discoveryState: 'observed',
    label: input.label,
    firstObservedAt: input.observedAt,
    firstObservedBy: input.ownerId,
    firstObservationId: input.observationId,
    lastObservedAt: input.observedAt,
    lastObservedBy: input.ownerId,
    lastObservationId: input.observationId,
    lastObservedSource: input.source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export interface CreateUserObservationResult {
  success: boolean;
  observationId?: string;
  error?: string;
  isNewIdentifier: boolean;
}

export interface CreateUserIdentifierObservationArgs {
  db: Firestore;
  identifierInput: {
    identifierKey: string;
    kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
    scheme: string;
    canonicalValue: string;
    rawValue?: string;
    label?: string;
  };
  observationInput: Omit<BuildUserObservationInput, 'observationId' | 'identifierKey' | 'observerUid'>;
  userContext: {
    uid: string;
    isAnonymous?: boolean;
  };
}

/**
 * Creates an observation and updates/creates the identifier safely in a transaction.
 * Does NOT create objects or bindings.
 */
export async function createUserIdentifierObservation(
  args: CreateUserIdentifierObservationArgs
): Promise<CreateUserObservationResult> {
  const { db, identifierInput, observationInput, userContext } = args;

  const identifierRef = doc(db, 'identifiers', identifierInput.identifierKey);
  const observationId = buildObservationId();
  const observationRef = doc(db, 'identifierObservations', observationId);

  try {
    let isNewIdentifier = false;

    await runTransaction(db, async (transaction) => {
      const idSnap = await transaction.get(identifierRef);

      if (!idSnap.exists()) {
        isNewIdentifier = true;
        // Create new unassigned/observed identifier
        const newIdentifier = buildObservedUnassignedIdentifierRecord({
          identifierKey: identifierInput.identifierKey,
          ownerId: userContext.uid,
          kind: identifierInput.kind,
          scheme: identifierInput.scheme,
          canonicalValue: identifierInput.canonicalValue,
          rawValue: identifierInput.rawValue,
          label: identifierInput.label,
          observationId: observationId,
          observedAt: observationInput.observedAt,
          source: observationInput.source,
        });
        transaction.set(identifierRef, newIdentifier);
      } else {
        const existingId = idSnap.data() as IdentifierRecord;

        // Ownership check
        if (existingId.ownerId !== userContext.uid) {
          throw new Error('Identifier belongs to another user.');
        }

        // Update existing identifier's last observation fields
        const updatePayload: Partial<IdentifierRecordWrite> = {
          lastObservedAt: observationInput.observedAt,
          lastObservedBy: userContext.uid,
          lastObservationId: observationId,
          lastObservedSource: observationInput.source,
          updatedAt: serverTimestamp(),
        };

        // Only backfill first observation fields if they are absent
        if (!existingId.firstObservedAt) {
          updatePayload.firstObservedAt = observationInput.observedAt;
        }
        if (!existingId.firstObservedBy) {
          updatePayload.firstObservedBy = userContext.uid;
        }
        if (!existingId.firstObservationId) {
          updatePayload.firstObservationId = observationId;
        }

        transaction.update(identifierRef, updatePayload);
      }

      // Write the observation
      const observationWrite = buildUserIdentifierObservationWrite({
        ...observationInput,
        observationId,
        identifierKey: identifierInput.identifierKey,
        observerUid: userContext.uid,
        observerIsAnonymous: userContext.isAnonymous,
      });

      transaction.set(observationRef, observationWrite);
    });

    return {
      success: true,
      observationId,
      isNewIdentifier,
    };
  } catch (err: any) {
    console.error('Failed to create observation:', err);
    return {
      success: false,
      error: err.message || 'Transaction failed',
      isNewIdentifier: false,
    };
  }
}
