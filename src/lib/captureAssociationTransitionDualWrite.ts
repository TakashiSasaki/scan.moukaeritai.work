import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { v7 as uuidv7 } from 'uuid';

import {
  buildObjectHasMarkerDetachedAssociationId,
  buildObjectHasMarkerActiveTransitionAssociationId,
  buildObjectHasMarkerDetachedAssociationWrite,
  buildObjectHasMarkerActiveTransitionAssociationWrite,
} from './entityFactProjectionWrites';

export function isCaptureAssociationTransitionDualWriteEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE === 'true';
}

export async function writeCaptureAssociationTransitionShadow(
  db: Firestore,
  input: {
    objectId: string;
    markerKey: string;
    actorUid: string;
    transition: 'detached' | 'active';
    legacy?: {
      sourceCollection?: string;
      bindingId?: string;
      bindingIds?: string[];
      ownerId?: string;
      detachedBy?: string;
      attachedBy?: string;
      runtimePath?: string;
    };
  }
): Promise<{
  status:
    | 'written'
    | 'skipped_disabled'
    | 'skipped_object_missing'
    | 'skipped_object_not_owned'
    | 'skipped_marker_missing'
    | 'skipped_marker_not_owned'
    | 'failed';
  associationId?: string;
  transition?: 'detached' | 'active';
  reason?: string;
}> {
  if (!isCaptureAssociationTransitionDualWriteEnabled()) {
    return { status: 'skipped_disabled' };
  }

  try {
    const objectRef = doc(db, 'objects', input.objectId);
    const objectSnap = await getDoc(objectRef);

    if (!objectSnap.exists()) {
      return { status: 'skipped_object_missing' };
    }
    if (objectSnap.data().ownerId !== input.actorUid) {
      return { status: 'skipped_object_not_owned' };
    }

    const markerRef = doc(db, 'markers', input.markerKey);
    const markerSnap = await getDoc(markerRef);

    if (!markerSnap.exists()) {
      return { status: 'skipped_marker_missing' };
    }
    if (markerSnap.data().ownerId !== input.actorUid) {
      return { status: 'skipped_marker_not_owned' };
    }

    const transitionId = uuidv7();
    let associationId: string;
    let writePayload;

    if (input.transition === 'detached') {
      associationId = buildObjectHasMarkerDetachedAssociationId(input.objectId, input.markerKey, transitionId);
      writePayload = buildObjectHasMarkerDetachedAssociationWrite({
        associationId,
        objectId: input.objectId,
        markerKey: input.markerKey,
        ownerId: input.actorUid,
        detachedAt: Timestamp.now(),
        actorUid: input.actorUid,
        legacy: input.legacy,
      });
    } else {
      associationId = buildObjectHasMarkerActiveTransitionAssociationId(input.objectId, input.markerKey, transitionId);
      writePayload = buildObjectHasMarkerActiveTransitionAssociationWrite({
        associationId,
        objectId: input.objectId,
        markerKey: input.markerKey,
        ownerId: input.actorUid,
        attachedAt: Timestamp.now(),
        actorUid: input.actorUid,
        legacy: input.legacy,
      });
    }

    const associationRef = doc(db, writePayload.collection, associationId);
    await setDoc(associationRef, writePayload.data);

    return { status: 'written', associationId, transition: input.transition };
  } catch (error: any) {
    return { status: 'failed', reason: error.message };
  }
}
