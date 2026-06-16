import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isScannerObservationDualWriteEnabled,
  writeScannerObservationShadow,
} from '../../src/lib/scannerObservationDualWrite';
import * as firestoreModule from 'firebase/firestore';

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
      now: vi.fn(() => ({ toMillis: () => 1234567890 })), // Mock Timestamp
    },
  };
});

describe('scannerObservationDualWrite', () => {
  const mockMarkerKey = 'test-marker';
  const mockObjectId = 'test-object';
  const mockActorUid = 'test-user';
  const mockScannedValue = 'https://example.com/id';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isScannerObservationDualWriteEnabled', () => {
    it('returns false by default', () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', '');
      expect(isScannerObservationDualWriteEnabled()).toBe(false);
    });

    it('returns true when env var is "true"', () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');
      expect(isScannerObservationDualWriteEnabled()).toBe(true);
    });
  });

  describe('writeScannerObservationShadow', () => {
    it('returns skipped_disabled if feature is disabled', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'false');

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('skipped_disabled');
      expect(firestoreModule.getDoc).not.toHaveBeenCalled();
    });

    it('returns skipped_missing_marker if marker is missing', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('skipped_missing_marker');
    });

    it('returns skipped_marker_not_owned if marker ownerId mismatch', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: 'other-user' }),
      } as any);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('skipped_marker_not_owned');
    });

    it('returns skipped_missing_marker if marker read fails with permission denied', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      vi.mocked(firestoreModule.getDoc).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('skipped_missing_marker');
      expect(result.reason).toBe('Marker missing or not readable');
    });

    it('writes successfully when marker is owned and object is omitted', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);
      vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
        scannedValue: mockScannedValue,
      });

      expect(result.status).toBe('written');
      expect(result.omittedObjectId).toBe(false);
      expect(firestoreModule.setDoc).toHaveBeenCalledTimes(1);

      const setDocCall = vi.mocked(firestoreModule.setDoc).mock.calls[0];
      const data = setDocCall[1] as any;
      expect(data.metadata).toEqual({ rawValue: mockScannedValue });
      // ensure we don't have object component
      expect(data.objectId).toBeUndefined();
    });

    it('writes successfully and omits objectId if object is missing', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      // First getDoc for marker
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);

      // Second getDoc for object
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        objectId: mockObjectId,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('written');
      expect(result.omittedObjectId).toBe(true);

      const setDocCall = vi.mocked(firestoreModule.setDoc).mock.calls[0];
      const data = setDocCall[1] as any;
      // verify objectId is absent from the participants
      expect(data.objectId).toBeUndefined();
    });

    it('writes successfully and omits objectId if object read fails with permission denied', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      // First getDoc for marker
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);

      // Second getDoc for object throws error
      vi.mocked(firestoreModule.getDoc).mockRejectedValueOnce(new Error('Permission denied'));

      vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        objectId: mockObjectId,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('written');
      expect(result.omittedObjectId).toBe(true);

      const setDocCall = vi.mocked(firestoreModule.setDoc).mock.calls[0];
      const data = setDocCall[1] as any;
      // verify objectId is absent from the participants
      expect(data.objectId).toBeUndefined();
    });

    it('writes successfully and omits objectId if object is not owned', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      // First getDoc for marker
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);

      // Second getDoc for object
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: 'other-user' })
      } as any);

      vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        objectId: mockObjectId,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('written');
      expect(result.omittedObjectId).toBe(true);

      const setDocCall = vi.mocked(firestoreModule.setDoc).mock.calls[0];
      const data = setDocCall[1] as any;
      // verify objectId is absent from the participants
      expect(data.objectId).toBeUndefined();
    });

    it('writes successfully and includes objectId if object is owned', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      // First getDoc for marker
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);

      // Second getDoc for object
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid })
      } as any);

      vi.mocked(firestoreModule.setDoc).mockResolvedValueOnce(undefined);

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        objectId: mockObjectId,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('written');
      expect(result.omittedObjectId).toBe(false);

      const setDocCall = vi.mocked(firestoreModule.setDoc).mock.calls[0];
      const data = setDocCall[1] as any;
      // verify objectId is included in participants
      expect(data.objectId).toBe(mockObjectId);
    });

    it('returns failed if setDoc throws', async () => {
      vi.stubEnv('VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE', 'true');

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ownerId: mockActorUid }),
      } as any);

      vi.mocked(firestoreModule.setDoc).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await writeScannerObservationShadow({
        markerKey: mockMarkerKey,
        actorUid: mockActorUid,
        source: 'qr',
      });

      expect(result.status).toBe('failed');
      expect(result.reason).toContain('Permission denied');
    });
  });
});
