import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { buildMarkerWriteFromIdentifierInput, buildObjectHasMarkerAssociationId, buildObjectHasMarkerAssociationWrite } from './entityFactProjectionWrites';

export function isCaptureMarkerAssociationDualWriteEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CAPTURE_MARKER_ASSOCIATION_DUAL_WRITE === 'true';
}

export async function writeCaptureMarkerAssociationShadow(input: {
  objectId: string;
  actorUid: string;
  identifier: {
    identifierKey: string;
    kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
    scheme: string;
    canonicalValue: string;
    rawValue?: string;
    rawPayload?: unknown;
  };
}): Promise<{
  status:
    | 'written'
    | 'skipped_disabled'
    | 'skipped_object_missing'
    | 'skipped_object_not_owned'
    | 'skipped_marker_not_owned'
    | 'skipped_association_exists'
    | 'failed';
  markerWritten?: boolean;
  associationWritten?: boolean;
  markerKey?: string;
  associationId?: string;
  reason?: string;
}> {
  if (!isCaptureMarkerAssociationDualWriteEnabled()) {
    return { status: 'skipped_disabled' };
  }

  let markerWritten = false;
  let associationWritten = false;
  const { identifierKey } = input.identifier;
  const associationId = buildObjectHasMarkerAssociationId(input.objectId, identifierKey);

  try {
    // 1. Verify object
    let objectData;
    try {
      const objectRef = doc(db, 'objects', input.objectId);
      const objectSnap = await getDoc(objectRef);

      if (!objectSnap.exists()) {
        return { status: 'skipped_object_missing', reason: 'Target object document not found' };
      }
      objectData = objectSnap.data();
    } catch (e) {
      // Permission denied or missing
      return { status: 'skipped_object_missing', reason: 'Target object document not found or unreadable' };
    }

    if (objectData.ownerId !== input.actorUid) {
      return { status: 'skipped_object_not_owned', reason: 'Object ownerId does not match actorUid' };
    }

    // 2. Check/create marker
    let markerExists = false;
    try {
      const markerRef = doc(db, 'markers', identifierKey);
      const markerSnap = await getDoc(markerRef);
      if (markerSnap.exists()) {
        markerExists = true;
        const markerData = markerSnap.data();
        if (markerData.ownerId !== input.actorUid) {
          return { status: 'skipped_marker_not_owned', reason: 'Existing marker ownerId does not match actorUid' };
        }
      }
    } catch (e) {
      // Missing document read denied by rules, meaning it likely doesn't exist,
      // or we don't own it. We'll attempt creation, and if it already exists and isn't owned,
      // the rule will block the creation or update anyway.
      markerExists = false;
    }

    if (!markerExists) {
      try {
        const markerWrite = buildMarkerWriteFromIdentifierInput({
          markerKey: identifierKey,
          ownerId: input.actorUid,
          kind: input.identifier.kind,
          scheme: input.identifier.scheme,
          canonicalValue: input.identifier.canonicalValue,
          rawValue: input.identifier.rawValue,
          rawPayload: input.identifier.rawPayload,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        await setDoc(doc(db, markerWrite.collection, markerWrite.id), markerWrite.data);
        markerWritten = true;
      } catch (e) {
        // Since we can't safely preflight read, the create might fail if it already exists but is owned by another user.
        return { status: 'skipped_marker_not_owned', reason: 'Failed to create marker. May exist and be owned by someone else.' };
      }
    }

    // 3. Check/create association
    let associationExists = false;
    try {
      const associationRef = doc(db, 'associations', associationId);
      const associationSnap = await getDoc(associationRef);

      if (associationSnap.exists()) {
        associationExists = true;
      }
    } catch (e) {
      // Same preflight logic
      associationExists = false;
    }

    if (associationExists) {
      return {
        status: 'skipped_association_exists',
        markerWritten,
        associationWritten: false,
        markerKey: identifierKey,
        associationId,
        reason: 'Target association already exists'
      };
    }

    try {
      const associationWrite = buildObjectHasMarkerAssociationWrite({
        associationId,
        objectId: input.objectId,
        markerKey: identifierKey,
        ownerId: input.actorUid,
        validFrom: Timestamp.now(),
        status: 'active',
        actorUid: input.actorUid
      });

      await setDoc(doc(db, associationWrite.collection, associationWrite.id), associationWrite.data);
      associationWritten = true;
    } catch (e) {
      // Fact is append-only for normal users.
      // If it exists but wasn't readable (different owners in participants, etc), setDoc fails.
      return {
        status: 'skipped_association_exists',
        markerWritten,
        associationWritten: false,
        markerKey: identifierKey,
        associationId,
        reason: 'Target association creation failed (might already exist)'
      };
    }

    return {
      status: 'written',
      markerWritten,
      associationWritten,
      markerKey: identifierKey,
      associationId
    };

  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'failed', reason };
  }
}
