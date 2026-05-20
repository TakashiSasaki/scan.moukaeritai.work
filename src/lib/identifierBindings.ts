import { serverTimestamp, collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import { ObjectIdentifierBindingRecord } from '../types';

/**
 * Builds a deterministic canonical active binding ID.
 * This prevents accumulating duplicate active rows for the same object-identifier pair.
 */
export function buildActiveBindingId(objectId: string, identifierKey: string): string {
  return `${objectId}__${identifierKey}__active`;
}

/**
 * Creates a canonical active binding record object.
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
