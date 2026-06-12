import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { buildObjectLocationMeasurementWrite } from './entityFactProjectionWrites';
import { v7 as uuidv7 } from 'uuid';

export function isCaptureLocationMeasurementDualWriteEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_CAPTURE_LOCATION_MEASUREMENT_DUAL_WRITE === 'true';
}

export async function writeCaptureLocationMeasurementShadow(input: {
  objectId: string;
  actorUid: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
}): Promise<{
  status:
    | 'written'
    | 'skipped_disabled'
    | 'skipped_object_missing'
    | 'skipped_object_not_owned'
    | 'skipped_invalid_location'
    | 'failed';
  measurementId?: string;
  reason?: string;
}> {
  if (!isCaptureLocationMeasurementDualWriteEnabled()) {
    return { status: 'skipped_disabled' };
  }

  try {
    // 1. Validate latitude and longitude
    const { latitude, longitude, accuracyMeters } = input;
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      (accuracyMeters !== undefined && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0))
    ) {
      return { status: 'skipped_invalid_location', reason: 'Invalid coordinates or accuracy' };
    }

    // 2. Verify objects/{objectId} exists and ownerId === actorUid
    const objectRef = doc(db, 'objects', input.objectId);
    const objectSnap = await getDoc(objectRef);

    if (!objectSnap.exists()) {
      return { status: 'skipped_object_missing', reason: 'Target object does not exist' };
    }

    const objectData = objectSnap.data();
    if (objectData.ownerId !== input.actorUid) {
      return { status: 'skipped_object_not_owned', reason: 'Target object is not owned by the current user' };
    }

    // 3. Create a target MeasurementDoc using buildObjectLocationMeasurementWrite
    const measurementId = uuidv7();
    const now = Timestamp.now();

    const writeBuilderOutput = buildObjectLocationMeasurementWrite({
      measurementId,
      objectId: input.objectId,
      actorUid: input.actorUid,
      measuredAt: now,
      receivedAt: now,
      latitude,
      longitude,
      accuracyMeters,
      address: input.address
    });

    const measurementRef = doc(db, 'measurements', measurementId);
    await setDoc(measurementRef, writeBuilderOutput.data);

    return { status: 'written', measurementId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { status: 'failed', reason: errorMessage };
  }
}
