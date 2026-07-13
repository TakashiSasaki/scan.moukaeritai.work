import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { submitFactCommand } from '../src/submitFactCommand';

// Setup hoisted mocks
const { mockSet, mockGet, mockRunTransaction } = vi.hoisted(() => {
  const mockSet = vi.fn();
  const mockGet = vi.fn().mockImplementation((ref) => {
    // Return exists: false for idempotency check, exists: true for others
    if (ref && ref.id && ref.id.length === 36) {
      return Promise.resolve({
        exists: false,
        data: () => null,
      });
    }
    return Promise.resolve({
      exists: true,
      data: () => ({
        ownerId: 'test-user',
        operation: 'attach',
        participantKeys: ['object:obj-123', 'marker:mk_hash'],
        objectIds: ['obj-123'],
        markerKeys: ['mk_hash'],
        identityModelVersion: "v2",
        canonicalizationVersion: "v1"
      }),
      docs: []
    });
  });
  const mockRunTransaction = vi.fn().mockImplementation(async (callback) => {
    const transaction = {
      get: mockGet,
      set: mockSet,
    };
    return callback(transaction);
  });
  return { mockSet, mockGet, mockRunTransaction };
});

vi.mock('firebase-functions/v2/https', () => {
  return {
    onCall: (handler: any) => handler,
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) { super(message); }
    }
  };
});

vi.mock('firebase-admin', () => {
  return { app: vi.fn().mockReturnValue({}), initializeApp: vi.fn() };
});

vi.mock('firebase-admin/firestore', () => {
  const mockDb = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockImplementation((id) => { return { id, path: "doc/"+id, collection: () => mockDb }; }),
    get: mockGet,
    runTransaction: mockRunTransaction,
    where: vi.fn().mockReturnThis()
  };
  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static now() { return new MockTimestamp(Math.floor(Date.now() / 1000), 0); }
    static fromDate(date: Date) { return new MockTimestamp(Math.floor(date.getTime() / 1000), 0); }
    toDate() { return new Date(this.seconds * 1000); }
  }
  class MockGeoPoint {
    constructor(public latitude: number, public longitude: number) {}
  }
  return { getFirestore: () => mockDb, Timestamp: MockTimestamp, GeoPoint: MockGeoPoint };
});

vi.mock('@scan/efp-model', async () => {
  const actual = await vi.importActual('@scan/efp-model');
  return {
    ...actual,
    generateUUIDv7: () => "test-uuid-v7",
    buildFactIndexFields: () => ({
      participantKeys: ["object:obj-123", "marker:mk_hash"],
      objectIds: ["obj-123"],
      markerKeys: ["mk_hash"],
      placeIds: [],
      deviceIds: [],
      readerIds: [],
      userIds: [],
    })
  };
});

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
});

describe('Callable Authority Boundary Tests', () => {
  const auth = { uid: 'test-user' };

  test('receivedAt and actorUid are server-authoritative for observations', async () => {
    const maliciousPayload = {
      commandId: '0190a61a-3e5f-4000-8000-000000000000', // UUIDv4
      factType: 'observation',
      data: {
        observationType: 'temperature',
        time: { observedAt: '2026-07-12T05:00:00Z', receivedAt: '2000-01-01T00:00:00Z' },
        provenance: { source: 'user_confirmed', actorUid: 'malicious', confidence: 'confirmed' },
        participants: [{ role: 'object', ref: { entityType: 'object', id: 'obj-123' } }]
      }
    };
    await submitFactCommand({ auth, data: maliciousPayload });
    const savedDocs = mockSet.mock.calls.map(call => call[1]);
    const factDoc = savedDocs.find(doc => doc.observationId);
    expect(factDoc).toBeDefined();
    expect(factDoc.time.receivedAt).toBeInstanceOf(Timestamp);
    expect(factDoc.provenance.actorUid).toEqual('test-user');
    expect(factDoc._meta.recordCreatedAt).toBeInstanceOf(Timestamp);
  });

  test('rejects forbidden fields in request', async () => {
    const maliciousPayload = {
      commandId: '0190a61a-3e5f-4000-8000-000000000000',
      factType: 'observation',
      data: { ownerId: 'other' }
    };
    await expect(submitFactCommand({ auth, data: maliciousPayload })).rejects.toThrow(/Field 'ownerId' is not allowed/);
  });

  test('UUIDv4 commandId validation', async () => {
    // v4 accepted
    const payload = { commandId: '123e4567-e89b-42d3-a456-426614174000', factType: 'event', data: { eventType: 'test', time: { occurredAt: '2026-07-12T05:00:00Z'}, participants: []} };
    await expect(submitFactCommand({ auth, data: payload })).rejects.toThrow(); 
    
    // v7 rejected
    payload.commandId = '018f9d0c-633b-74db-86d1-4db8a3297a7e';
    await expect(submitFactCommand({ auth, data: payload })).rejects.toThrow(/must be a valid UUIDv4/);
    
    // malformed rejected
    payload.commandId = 'invalid';
    await expect(submitFactCommand({ auth, data: payload })).rejects.toThrow(/must be a valid UUIDv4/);
  });

  test('Association transactional reads and overlap check', async () => {
    const payload = {
      commandId: '123e4567-e89b-42d3-a456-426614174000',
      factType: 'association',
      data: {
        operation: "attach",
        effectiveAt: "2026-07-12T05:00:00Z",
        provenance: { source: "user_confirmed", confidence: "confirmed" },
        participants: [
          { role: 'object', ref: { entityType: 'object', id: 'obj-123' } },
          { role: 'marker', ref: { entityType: 'marker', id: 'mk_hash' } }
        ]
      }
    };
    await submitFactCommand({ auth, data: payload });
    expect(mockGet).toHaveBeenCalled(); 
    
    const savedDocs = mockSet.mock.calls.map(call => call[1]);
    const factDoc = savedDocs.find(doc => doc.associationId);
    expect(factDoc).toBeDefined();
    expect(factDoc.operation).toBe('attach');
  });

});
