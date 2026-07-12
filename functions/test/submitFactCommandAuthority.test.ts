import { describe, test, expect, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

// Setup hoisted mocks to resolve hoisting order issues in Vitest
const { mockSet, mockGet, mockRunTransaction, setLastCollection } = vi.hoisted(() => {
  const mockSet = vi.fn();
  let lastCollectionName = '';

  const mockGet = vi.fn().mockImplementation(() => {
    // Return exists: false for idempotency check, and exists: true for entities
    if (lastCollectionName === 'factCommands') {
      return Promise.resolve({
        exists: false,
        data: () => null,
      });
    }
    return Promise.resolve({
      exists: true,
      data: () => ({
        ownerId: 'test-user',
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

  return { 
    mockSet, 
    mockGet, 
    mockRunTransaction,
    setLastCollection: (name: string) => { lastCollectionName = name; }
  };
});

// Mock firebase-functions v2 https module
vi.mock('firebase-functions/v2/https', () => {
  return {
    onCall: (handler: any) => {
      return handler;
    },
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) {
        super(message);
      }
    }
  };
});

// Mock firebase-admin app lifecycle
vi.mock('firebase-admin', () => {
  return {
    app: vi.fn().mockReturnValue({}),
    initializeApp: vi.fn()
  };
});

// Mock firebase-admin/firestore using inline mock classes
vi.mock('firebase-admin/firestore', () => {
  const mockDb = {
    collection: vi.fn().mockImplementation((name) => {
      setLastCollection(name);
      return mockDb;
    }),
    doc: vi.fn().mockReturnThis(),
    get: mockGet,
    runTransaction: mockRunTransaction,
    where: vi.fn().mockReturnThis()
  };

  class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    static now() {
      return new MockTimestamp(Math.floor(Date.now() / 1000), 0);
    }
    static fromDate(date: Date) {
      return new MockTimestamp(Math.floor(date.getTime() / 1000), 0);
    }
    toDate() {
      return new Date(this.seconds * 1000);
    }
  }

  class MockGeoPoint {
    constructor(public latitude: number, public longitude: number) {}
  }

  return {
    getFirestore: () => mockDb,
    Timestamp: MockTimestamp,
    GeoPoint: MockGeoPoint
  };
});

// Mock efp-model validations to bypass schemas and logic safely
vi.mock('@scan/efp-model', () => {
  return {
    generateUUIDv7: () => 'test-uuid-v7',
    validateAssociationSemantics: () => true,
    validateDerivedIndexes: () => true,
    stripUndefinedDeep: (x: any) => x,
    buildFactIndexFields: () => ({
      participantKeys: [],
      objectIds: [],
      markerKeys: [],
      placeIds: [],
      deviceIds: [],
      readerIds: [],
      userIds: [],
    }),
  };
});

// Dynamically import test subject after hoisting mocks
import { submitFactCommand } from '../src/submitFactCommand';

describe('Callable Authority Boundary Tests', () => {
  test('receivedAt and actorUid are server-authoritative for observations', async () => {
    const maliciousPayload = {
      commandId: '0190a61a-3e5f-4000-8000-000000000000', // Valid UUIDv4
      factType: 'observation',
      data: {
        observationType: 'temperature',
        time: {
          observedAt: '2026-07-12T05:00:00Z',
          receivedAt: '2000-01-01T00:00:00Z' // spoofed past timestamp
        },
        provenance: {
          source: 'user_confirmed', // Valid allowed enum
          actorUid: 'malicious-user-uid', // spoofed actorUid
          confidence: 'confirmed' // Valid allowed enum
        },
        participants: [
          {
            role: 'subject',
            ref: { entityType: 'object', id: 'obj-123' }
          }
        ]
      }
    };

    const mockRequest = {
      auth: {
        uid: 'test-user' // true authenticated uid
      },
      data: maliciousPayload
    };

    await submitFactCommand(mockRequest);

    expect(mockSet).toHaveBeenCalled();
    
    // Get doc payloads passed to transaction.set
    const savedDocs = mockSet.mock.calls.map(call => call[1]);
    const factDoc = savedDocs.find(doc => doc.observationId === 'test-uuid-v7');
    
    expect(factDoc).toBeDefined();
    
    // Assert client spoofed receivedAt was rejected and overridden with server Timestamp
    expect(factDoc.time.receivedAt).not.toEqual(Timestamp.fromDate(new Date('2000-01-01T00:00:00Z')));
    expect(factDoc.time.receivedAt).toBeInstanceOf(Timestamp);
    
    // Assert client spoofed actorUid was rejected and overridden with true auth ownerId
    expect(factDoc.provenance.actorUid).toEqual('test-user');
    expect(factDoc._meta.recordCreatedBy).toEqual('test-user');
  });

  test('receivedAt and actorUid are server-authoritative for measurements', async () => {
    mockSet.mockClear();
    
    const maliciousPayload = {
      commandId: '0190a61a-3e5f-4000-8000-000000000001', // Valid UUIDv4
      factType: 'measurement',
      data: {
        measurementType: 'humidity',
        time: {
          measuredAt: '2026-07-12T05:00:00Z',
          receivedAt: '2000-01-01T00:00:00Z' // spoofed
        },
        provenance: {
          source: 'user_confirmed', // Valid allowed enum
          actorUid: 'malicious-user-uid', // spoofed
          confidence: 'confirmed' // Valid allowed enum
        },
        participants: [
          {
            role: 'subject',
            ref: { entityType: 'object', id: 'obj-123' }
          }
        ]
      }
    };

    const mockRequest = {
      auth: {
        uid: 'test-user'
      },
      data: maliciousPayload
    };

    await submitFactCommand(mockRequest);

    const savedDocs = mockSet.mock.calls.map(call => call[1]);
    const factDoc = savedDocs.find(doc => doc.measurementId === 'test-uuid-v7');
    
    expect(factDoc).toBeDefined();
    expect(factDoc.time.receivedAt).not.toEqual(Timestamp.fromDate(new Date('2000-01-01T00:00:00Z')));
    expect(factDoc.time.receivedAt).toBeInstanceOf(Timestamp);
    expect(factDoc.provenance.actorUid).toEqual('test-user');
  });
});
