import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { buildMarkerObservedWrite } from './entityFactProjectionWrites';
import { v7 as uuidv7 } from 'uuid';

type ClientObservationSource = 'qr' | 'nfc' | 'manual' | 'barcode' | 'camera';

function isClientObservationSource(source: string): source is ClientObservationSource {
  return source === 'qr'
    || source === 'nfc'
    || source === 'manual'
    || source === 'barcode'
    || source === 'camera';
}

export function isScannerObservationDualWriteEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE === 'true';
}

export async function writeScannerObservationShadow(input: {
  markerKey: string;
  objectId?: string;
  actorUid: string;
  source: 'qr' | 'nfc' | string;
  scannedValue?: string;
}): Promise<{
  status:
    | 'written'
    | 'skipped_disabled'
    | 'skipped_missing_marker'
    | 'skipped_marker_not_owned'
    | 'failed';
  observationId?: string;
  reason?: string;
  omittedObjectId?: boolean;
}> {
  if (!isScannerObservationDualWriteEnabled()) {
    return { status: 'skipped_disabled' };
  }

  try {
    // 1. Verify marker exists and is owned by actorUid
    try {
      const markerRef = doc(db, 'markers', input.markerKey);
      const markerSnap = await getDoc(markerRef);

      if (!markerSnap.exists()) {
        return { status: 'skipped_missing_marker', reason: 'Marker document not found' };
      }

      const markerData = markerSnap.data();
      if (markerData.ownerId !== input.actorUid) {
        return { status: 'skipped_marker_not_owned', reason: 'Marker ownerId does not match actorUid' };
      }
    } catch (error) {
      // If getting the marker fails (e.g., permission denied because it's missing or unowned),
      // treat it as skipped instead of failing the entire write.
      return { status: 'skipped_missing_marker', reason: 'Marker missing or not readable' };
    }

    // 2. Verify object exists and is owned by actorUid (if objectId is provided)
    let safeObjectId: string | undefined = undefined;
    let omittedObjectId = false;

    if (input.objectId) {
      try {
        const objectRef = doc(db, 'objects', input.objectId);
        const objectSnap = await getDoc(objectRef);

        if (objectSnap.exists()) {
          const objectData = objectSnap.data();
          if (objectData.ownerId === input.actorUid) {
            safeObjectId = input.objectId;
          } else {
            omittedObjectId = true; // Object not owned by actorUid
          }
        } else {
          omittedObjectId = true; // Object does not exist
        }
      } catch (error) {
        // If getting the object fails (e.g., permission denied), safely omit it
        // and proceed with writing a marker-only observation.
        omittedObjectId = true;
      }
    }

    // 3. Build target observation write
    if (!isClientObservationSource(input.source)) {
      return { status: 'failed', reason: `Unsupported observation source: ${input.source}` };
    }

    const observationId = uuidv7();
    const now = Timestamp.now();
    const serverTime = serverTimestamp() as Timestamp;
    const payload = input.scannedValue ? { rawValue: input.scannedValue } : undefined;

    const builderOutput = buildMarkerObservedWrite({
      observationId,
      markerKey: input.markerKey,
      objectId: safeObjectId,
      actorUid: input.actorUid,
      observedAt: now,
      receivedAt: serverTime,
      source: input.source,
      payload,
    });

    // 4. Execute target observation write
    await setDoc(doc(db, builderOutput.collection, builderOutput.id), builderOutput.data);

    return {
      status: 'written',
      observationId,
      omittedObjectId,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'failed', reason };
  }
}
