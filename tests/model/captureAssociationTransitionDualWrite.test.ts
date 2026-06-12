import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  writeCaptureAssociationTransitionShadow,
  isCaptureAssociationTransitionDualWriteEnabled,
} from '../../src/lib/captureAssociationTransitionDualWrite';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ seconds: 100, nanoseconds: 0 })),
    },
  };
});

vi.mock('uuid', () => ({
  v7: vi.fn(() => 'test-uuid-v7-1234'),
}));

const mockEnv = {
  VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE: 'true'
};

describe('captureAssociationTransitionDualWrite', () => {
  const mockDb = {} as firestore.Firestore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE = 'true';
    vi.stubEnv('VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE', 'true');
    vi.stubGlobal('import', {
      meta: {
        env: mockEnv
      }
    });
  });

  it('should return skipped_disabled if the feature flag is not true', async () => {
    mockEnv.VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE = 'false';
    vi.stubEnv('VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE', 'false');
    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });
    expect(result.status).toBe('skipped_disabled');
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('should return skipped_object_missing if the target object does not exist', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });
    expect(result.status).toBe('skipped_object_missing');
  });

  it('should return skipped_object_not_owned if the target object is not owned by actorUid', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'other-user' }),
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });
    expect(result.status).toBe('skipped_object_not_owned');
  });

  it('should return skipped_marker_missing if the target marker does not exist', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });
    expect(result.status).toBe('skipped_marker_missing');
  });

  it('should return skipped_marker_not_owned if the target marker is not owned by actorUid', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'other-user' }),
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });
    expect(result.status).toBe('skipped_marker_not_owned');
  });

  it('should successfully write a detached transition Association Fact', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });

    expect(result.status).toBe('written');
    expect(result.transition).toBe('detached');
    expect(result.associationId).toMatch(/object_has_marker_detached__obj1__m1__/);
    expect(firestore.setDoc).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(firestore.setDoc).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      associationType: 'object_has_marker',
      status: 'detached',
      participants: [
        { role: 'object', ref: { entityType: 'object', id: 'obj1' } },
        { role: 'marker', ref: { entityType: 'marker', id: 'm1' } },
      ],
      time: { validUntil: { seconds: 100, nanoseconds: 0 } },
      provenance: { source: 'user_confirmed', confidence: 'confirmed', actorUid: 'user1' }
    });
  });

  it('should successfully write an active transition Association Fact for reattach', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'active'
    });

    expect(result.status).toBe('written');
    expect(result.transition).toBe('active');
    expect(result.associationId).toMatch(/object_has_marker_active__obj1__m1__/);
    expect(firestore.setDoc).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(firestore.setDoc).mock.calls[0];
    expect(callArgs[1]).toMatchObject({
      associationType: 'object_has_marker',
      status: 'active',
      participants: [
        { role: 'object', ref: { entityType: 'object', id: 'obj1' } },
        { role: 'marker', ref: { entityType: 'marker', id: 'm1' } },
      ],
      time: { validFrom: { seconds: 100, nanoseconds: 0 } },
      provenance: { source: 'user_confirmed', confidence: 'confirmed', actorUid: 'user1' }
    });
  });

  it('should return failed if setDoc throws an error', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ownerId: 'user1' }),
    } as any);

    vi.mocked(firestore.setDoc).mockRejectedValueOnce(new Error('Network Error'));

    const result = await writeCaptureAssociationTransitionShadow(mockDb, {
      objectId: 'obj1',
      markerKey: 'm1',
      actorUid: 'user1',
      transition: 'detached'
    });

    expect(result.status).toBe('failed');
    expect(result.reason).toBe('Network Error');
  });
});
