import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeCaptureMarkerAssociationShadow, isCaptureMarkerAssociationDualWriteEnabled } from '../../src/lib/captureMarkerAssociationDualWrite';
import * as firestore from 'firebase/firestore';

// Mock dependencies
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual as any,
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ toMillis: () => 1000, toDate: () => new Date(1000) }))
    }
  };
});
vi.mock('../../src/lib/firebase', () => ({
  db: {}
}));

describe('captureMarkerAssociationDualWrite', () => {
  const mockInput = {
    objectId: 'OBJ-1',
    actorUid: 'USER-1',
    identifier: {
      identifierKey: 'MK-1',
      kind: 'qr' as const,
      scheme: 'qr-plain-token',
      canonicalValue: 'ABC'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_ENABLE_CAPTURE_MARKER_ASSOCIATION_DUAL_WRITE', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns skipped_disabled when feature flag is off', async () => {
    vi.stubEnv('VITE_ENABLE_CAPTURE_MARKER_ASSOCIATION_DUAL_WRITE', 'false');
    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('skipped_disabled');
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_object_missing if object does not exist', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined
    } as any);

    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('skipped_object_missing');
  });

  it('returns skipped_object_not_owned if object is not owned by actorUid', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'OTHER_USER' })
    } as any);

    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('skipped_object_not_owned');
  });

  it('creates marker and association if both are missing', async () => {
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // object
      .mockResolvedValueOnce({ exists: () => false, data: () => undefined } as any) // marker
      .mockResolvedValueOnce({ exists: () => false, data: () => undefined } as any); // association

    const result = await writeCaptureMarkerAssociationShadow(mockInput);

    expect(result.status).toBe('written');
    expect(result.markerWritten).toBe(true);
    expect(result.associationWritten).toBe(true);
    expect(firestore.setDoc).toHaveBeenCalledTimes(2); // one for marker, one for association
  });

  it('skips marker creation but creates association if marker exists and is owned', async () => {
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // object
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // marker
      .mockResolvedValueOnce({ exists: () => false, data: () => undefined } as any); // association

    const result = await writeCaptureMarkerAssociationShadow(mockInput);

    expect(result.status).toBe('written');
    expect(result.markerWritten).toBe(false);
    expect(result.associationWritten).toBe(true);
    expect(firestore.setDoc).toHaveBeenCalledTimes(1); // only association
  });

  it('returns skipped_marker_not_owned if marker exists but is owned by another user', async () => {
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // object
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'OTHER_USER' }) } as any); // marker

    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('skipped_marker_not_owned');
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('returns skipped_association_exists if association already exists', async () => {
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // object
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any) // marker
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ownerId: 'USER-1' }) } as any); // association

    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('skipped_association_exists');
    expect(result.associationWritten).toBe(false);
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('returns failed if a firestore operation throws', async () => {
    vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error('Network error'));

    const result = await writeCaptureMarkerAssociationShadow(mockInput);
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('Network error');
  });
});
