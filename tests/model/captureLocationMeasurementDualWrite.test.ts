import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isCaptureLocationMeasurementDualWriteEnabled,
  writeCaptureLocationMeasurementShadow,
} from '../../src/lib/captureLocationMeasurementDualWrite';

// Mock dependencies
vi.mock('../../src/lib/firebase', () => ({
  db: {}, // Mock db object
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ toMillis: () => 1000, toDate: () => new Date(1000) })),
    },
  };
});

import * as firestoreModule from 'firebase/firestore';

describe('captureLocationMeasurementDualWrite', () => {
  const mockInput = {
    objectId: 'OBJ-1',
    actorUid: 'USER-1',
    latitude: 35.6895,
    longitude: 139.6917,
    accuracyMeters: 10,
    address: 'Tokyo, Japan'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ENABLE_CAPTURE_LOCATION_MEASUREMENT_DUAL_WRITE', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns skipped_disabled if feature flag is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_CAPTURE_LOCATION_MEASUREMENT_DUAL_WRITE', 'false');

    expect(isCaptureLocationMeasurementDualWriteEnabled()).toBe(false);

    const result = await writeCaptureLocationMeasurementShadow(mockInput);

    expect(result.status).toBe('skipped_disabled');
    expect(firestoreModule.getDoc).not.toHaveBeenCalled();
    expect(firestoreModule.setDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_invalid_location for invalid latitude', async () => {
    const result = await writeCaptureLocationMeasurementShadow({ ...mockInput, latitude: 100 }); // out of bounds
    expect(result.status).toBe('skipped_invalid_location');
    expect(firestoreModule.getDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_invalid_location for invalid longitude', async () => {
    const result = await writeCaptureLocationMeasurementShadow({ ...mockInput, longitude: -200 }); // out of bounds
    expect(result.status).toBe('skipped_invalid_location');
    expect(firestoreModule.getDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_invalid_location for invalid accuracyMeters', async () => {
    const result = await writeCaptureLocationMeasurementShadow({ ...mockInput, accuracyMeters: -5 }); // negative
    expect(result.status).toBe('skipped_invalid_location');
    expect(firestoreModule.getDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_object_missing if target object does not exist', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as any);

    const result = await writeCaptureLocationMeasurementShadow(mockInput);

    expect(result.status).toBe('skipped_object_missing');
    expect(firestoreModule.getDoc).toHaveBeenCalledTimes(1);
    expect(firestoreModule.setDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_object_not_owned if target object belongs to another user', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'OTHER_USER' }),
    } as any);

    const result = await writeCaptureLocationMeasurementShadow(mockInput);

    expect(result.status).toBe('skipped_object_not_owned');
    expect(firestoreModule.getDoc).toHaveBeenCalledTimes(1);
    expect(firestoreModule.setDoc).not.toHaveBeenCalled();
  });

  it('writes MeasurementDoc if target object exists and is owned by actorUid', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'USER-1' }),
    } as any);

    vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

    const result = await writeCaptureLocationMeasurementShadow(mockInput);

    expect(result.status).toBe('written');
    expect(result.measurementId).toBeDefined();
    expect(firestoreModule.getDoc).toHaveBeenCalledTimes(1);
    expect(firestoreModule.setDoc).toHaveBeenCalledTimes(1);

    // Check that the payload preserves the address in legacy
    const setDocArgs = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    const data = setDocArgs[1] as any;
    expect(data.legacy?.address).toBe('Tokyo, Japan');
    expect(data.position.latitude).toBe(35.6895);
    expect(data.position.longitude).toBe(139.6917);
    expect(data.position.accuracyMeters).toBe(10);
  });

  it('returns failed if an unexpected error occurs', async () => {
    vi.mocked(firestoreModule.getDoc).mockRejectedValueOnce(new Error('Network error'));

    const result = await writeCaptureLocationMeasurementShadow(mockInput);

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('Network error');
  });
});
