import { serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { IdentifierRecord, ObjectIdentifierBindingRecord } from '../types';

/**
 * Builds a deterministic canonical active binding ID.
 * This prevents accumulating duplicate active rows for the same object-identifier pair.
 *
 * Design Note:
 * `objectIdentifierBindings` is used ONLY to store the canonical active relationship
 * state between an object and an identifier. It is NOT an append-only history table.
 * All historical events (attach, detach, replace) MUST be recorded in the `objectEvents` table.
 */
export function buildActiveBindingId(objectId: string, identifierKey: string): string {
  return `${objectId}__${identifierKey}__active`;
}

/**
 * Creates a canonical active binding record object.
 * Note: When creating a new active binding, always query for existing active bindings
 * first to avoid overwriting `createdAt` and `attachedAt`. Event history belongs in `objectEvents`.
 */
export function buildActiveBindingRecord(
  bindingId: string,
  ownerId: string,
  objectId: string,
  identifierKey: string,
  attachedByUid: string
): ObjectIdentifierBindingRecord {
  return {
    bindingId,
    ownerId,
    objectId,
    identifierKey,
    status: 'active',
    attachedAt: serverTimestamp() as any,
    attachedBy: attachedByUid,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
}

/**
 * Validates if an identifier can be attached to the target object.
 * Checks for ownership, active status, and reassignment rules.
 */
export async function validateIdentifierCanAttach(
  identifierKey: string,
  targetObjectId: string,
  uid: string
): Promise<{ canAttach: boolean; isIdempotent: boolean; error?: string }> {
  const idRef = doc(db, 'identifiers', identifierKey);
  const idSnap = await getDoc(idRef);

  if (!idSnap.exists()) {
    return { canAttach: true, isIdempotent: false };
  }

  const existingId = idSnap.data() as IdentifierRecord;

  if (existingId.ownerId !== uid) {
    return { canAttach: false, isIdempotent: false, error: 'Identifier belongs to another user.' };
  }

  if (existingId.status === 'active') {
    if (existingId.objectId !== targetObjectId) {
      return { canAttach: false, isIdempotent: false, error: 'Identifier is already active on another object.' };
    } else {
      // It's already active on the SAME object.
      return { canAttach: true, isIdempotent: true };
    }
  }

  if (existingId.status === 'unassigned') {
    return { canAttach: true, isIdempotent: false };
  }

  // status is retired, lost, or replaced
  return { canAttach: false, isIdempotent: false, error: `Cannot attach identifier with status: ${existingId.status}.` };
}

/**
 * Creates a patch object to transition an active binding to detached.
 */
export function buildDetachedBindingPatch(
  detachedByUid: string
): Partial<ObjectIdentifierBindingRecord> {
  return {
    status: 'detached',
    detachedAt: serverTimestamp() as any,
    detachedBy: detachedByUid,
    updatedAt: serverTimestamp() as any,
  };
}
