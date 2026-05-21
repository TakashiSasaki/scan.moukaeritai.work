import { serverTimestamp, getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
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
 * Pure helper to merge an updated or new identifier into a list, matching by identifierKey.
 */
export function mergeIdentifierForSummary(
  identifiers: IdentifierRecord[],
  identifier: IdentifierRecord
): IdentifierRecord[] {
  const byKey = new Map<string, IdentifierRecord>();
  for (const existing of identifiers) {
    byKey.set(existing.identifierKey, existing);
  }
  byKey.set(identifier.identifierKey, identifier);
  return Array.from(byKey.values());
}

/**
 * Loads current identifiers for an object to be used in summary recomputations.
 */
export async function loadObjectIdentifiersForSummary(
  db: Firestore,
  ownerId: string,
  objectId: string
): Promise<IdentifierRecord[]> {
  const q = query(
    collection(db, 'identifiers'),
    where('ownerId', '==', ownerId),
    where('objectId', '==', objectId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as IdentifierRecord);
}

/**
 * Validates if an identifier can be attached to the target object.
 * Checks for ownership, active status, and reassignment rules.
 */
export async function validateIdentifierCanAttach(
  db: Firestore,
  identifierKey: string,
  targetObjectId: string,
  uid: string
): Promise<{ canAttach: boolean; isIdempotent: boolean; error?: string; existingId: IdentifierRecord | null }> {
  const idRef = doc(db, 'identifiers', identifierKey);
  let idSnap;

  try {
    idSnap = await getDoc(idRef);
  } catch (err: any) {
    // If Firestore rules deny access (e.g., document exists but belongs to someone else),
    // getDoc will throw a permission-denied error. We catch it and fail gracefully.
    console.warn('validateIdentifierCanAttach permission error:', err);
    return { canAttach: false, isIdempotent: false, error: 'Identifier belongs to another user or is inaccessible.', existingId: null };
  }

  if (!idSnap.exists()) {
    return { canAttach: true, isIdempotent: false, existingId: null };
  }

  const existingId = idSnap.data() as IdentifierRecord;

  if (existingId.ownerId !== uid) {
    return { canAttach: false, isIdempotent: false, error: 'Identifier belongs to another user.', existingId };
  }

  if (existingId.status === 'active') {
    if (existingId.objectId !== targetObjectId) {
      return { canAttach: false, isIdempotent: false, error: 'Identifier is already active on another object.', existingId };
    } else {
      // It's already active on the SAME object.
      return { canAttach: true, isIdempotent: true, existingId };
    }
  }

  if (existingId.status === 'unassigned') {
    return { canAttach: true, isIdempotent: false, existingId };
  }

  // status is retired, lost, or replaced
  return { canAttach: false, isIdempotent: false, error: `Cannot attach identifier with status: ${existingId.status}.`, existingId };
}

/**
 * Finds active bindings for a specific owner, object, and identifier.
 * Compatible with owner-scoped Firestore rules.
 */
export async function findActiveBindingsForOwner(
  db: Firestore,
  ownerId: string,
  objectId: string,
  identifierKey: string
) {
  const q = query(
    collection(db, 'objectIdentifierBindings'),
    where('ownerId', '==', ownerId),
    where('objectId', '==', objectId),
    where('identifierKey', '==', identifierKey),
    where('status', '==', 'active')
  );

  const snap = await getDocs(q);
  return snap.docs;
}

/**
 * Finds canonical bindings (active or detached) for a specific owner, object, and identifier.
 * Compatible with owner-scoped Firestore rules.
 */
export async function findCanonicalBindingsForOwner(
  db: Firestore,
  ownerId: string,
  objectId: string,
  identifierKey: string
) {
  const q = query(
    collection(db, 'objectIdentifierBindings'),
    where('ownerId', '==', ownerId),
    where('objectId', '==', objectId),
    where('identifierKey', '==', identifierKey)
  );

  const snap = await getDocs(q);
  return snap.docs;
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
