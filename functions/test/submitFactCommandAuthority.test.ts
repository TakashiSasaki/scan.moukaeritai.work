import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { submitFactCommand } from '../src/submitFactCommand';
import { resetValidatorsCache } from '../src/logicalFactBuilder';

// Setup hoisted mocks
const { mockSet, mockGet, mockRunTransaction, mockWhere, idempotencyState, getSetCallCount, resetSetCallCount } = vi.hoisted(() => {
  const mockSet = vi.fn();
  
  let databaseState: any = {
    'doc/object1': { ownerId: 'test-user' },
    'doc/marker1': { ownerId: 'test-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'doc/marker2': { ownerId: 'test-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'doc/marker-other': { ownerId: 'other-user', identityModelVersion: 'v2', canonicalizationVersion: 'v1' },
    'doc/place1': { ownerId: 'test-user' },
    'doc/assoc1': { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] },
    'doc/assoc1_already_detached': { ownerId: 'test-user', operation: 'attach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] },
    'doc/assoc2': { ownerId: 'test-user', operation: 'detach', participantKeys: ['marker:marker1', 'object:object1'], objectIds: ['object1'], markerKeys: ['marker1'] }
  };
  let idempotencyState: any = {};
  let setCallCount = 0;
  
  const mockGet = vi.fn().mockImplementation((ref) => {
    if (ref && ref.path && databaseState[ref.path]) {
      return Promise.resolve({ exists: true, data: () => databaseState[ref.path] });
    }
    if (ref && ref.path && idempotencyState[ref.path]) {
      return Promise.resolve({ exists: true, data: () => idempotencyState[ref.path] });
    }
    // Handle mock query
    if (ref && ref._isQuery) {
      if (ref._duplicateMatch) {
         return Promise.resolve({ docs: [{ data: () => ({ operation: "detach" }) }] });
      }
      return Promise.resolve({ docs: [] });
    }
    return Promise.resolve({ exists: false, data: () => null });
  });

  const mockWhere = vi.fn().mockImplementation(function(this: any, field, op, val) {
     let query: any = { _isQuery: true, get: mockGet, _duplicateMatch: this?._duplicateMatch };
     query.where = mockWhere.bind(query);
     if (field === "subjectAssociationId" && val === "assoc1_already_detached") {
        query._duplicateMatch = true;
     }
     return query;
  });

  const mockRunTransaction = vi.fn().mockImplementation(async (callback) => {
    const transaction = {
      get: mockGet,
      set: (ref: any, data: any) => {
         mockSet(ref, data);
         if (ref && ref.path && ref.path.startsWith('doc/test-user|')) {
           idempotencyState[ref.path] = data;
         } else if (ref && ref.path) {
           databaseState[ref.path] = data;
         }
      }
    };
    return callback(transaction);
  });
  return { mockSet, mockGet, mockRunTransaction, mockWhere, databaseState, idempotencyState, getSetCallCount: () => setCallCount, resetSetCallCount: () => { setCallCount = 0; } };
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
    where: mockWhere
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

beforeEach(() => {
  resetValidatorsCache();
  mockSet.mockClear();
  mockGet.mockClear();
  // Reset idempotency state
  for (const key of Object.keys(idempotencyState)) delete idempotencyState[key];
});

describe('Idempotency and Transitions', () => {
  const auth = { uid: 'test-user' };

  test('Valid UUIDv4 request is accepted and echoes commandId', async () => {
    const cmdId = "123e4567-e89b-42d3-a456-426614174000";
    const payload = {
      commandId: cmdId,
      factType: "event",
      data: {
        eventType: "test",
        time: { occurredAt: "2026-07-12T05:00:00Z" },
        provenance: { source: "user_confirmed", confidence: "high" },
        participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }]
      }
    };
    const res = await submitFactCommand({ auth, data: payload });
    expect(res.success).toBe(true);
    expect(res.commandId).toBe(cmdId);
  });

  test('Idempotency logic matrix', async () => {
    const cmdId = "123e4567-e89b-42d3-a456-426614174000";
    const payload1 = {
      commandId: cmdId,
      factType: "event",
      data: {
        eventType: "test",
        time: { occurredAt: "2026-07-12T05:00:00Z" },
        provenance: { source: "user_confirmed", confidence: "high" },
        participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }]
      }
    };

    // 1. Initial success
    const res1 = await submitFactCommand({ auth, data: payload1 });
    expect(res1.success).toBe(true);
    expect(res1.factId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    mockSet.mockClear();

    // 2. Exact replay -> return same factId, NO write
    const res2 = await submitFactCommand({ auth, data: payload1 });
    expect(res2.factId).toBe(res1.factId);
    expect(res2.factId).toBe(res1.factId);

    // 3. Same commandId, different data -> reject
    const payloadDifferentData = JSON.parse(JSON.stringify(payload1));
    payloadDifferentData.data.eventType = "other";
    await expect(submitFactCommand({ auth, data: payloadDifferentData })).rejects.toThrow(/Same commandId received with a different payload/);

    // 4. Same commandId, different factType -> reject
    const payloadDifferentType = { ...payload1, factType: "measurement", data: { measurementType: "test", time: { measuredAt: "2026-07-12T05:00:00Z" }, provenance: { source: "user_confirmed", confidence: "high" }, participants: [{ role: "object", ref: { entityType: "object", id: "object1" } }] } };
    await expect(submitFactCommand({ auth, data: payloadDifferentType })).rejects.toThrow(/Same commandId received with a different factType/);

    // 5. Different owner, same commandId -> successful independent insert
    const otherAuth = { uid: "other-user" };
    const res3 = await submitFactCommand({ auth: otherAuth, data: payload1 });
    expect(res3.success).toBe(true);
    expect(res3.commandId).toBe(cmdId);
  });

  test('Association transitions: attach, detach, replace', async () => {
    const payloadAttach = {
      commandId: "123e4567-e89b-42d3-a456-426614174001",
      factType: "association",
      data: {
        operation: "attach",
        effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "object1" } },
          { role: "marker", ref: { entityType: "marker", id: "marker1" } }
        ]
      }
    };
    const resA = await submitFactCommand({ auth, data: payloadAttach });
    expect(resA.success).toBe(true);

    const payloadDetach = {
      commandId: "123e4567-e89b-42d3-a456-426614174002",
      factType: "association",
      data: {
        operation: "detach",
        subjectAssociationId: "assoc1",
        effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "object1" } },
          { role: "marker", ref: { entityType: "marker", id: "marker1" } }
        ]
      }
    };
    const resD = await submitFactCommand({ auth, data: payloadDetach });
    expect(resD.success).toBe(true);

    const payloadReplace = {
      commandId: "123e4567-e89b-42d3-a456-426614174003",
      factType: "association",
      data: {
        operation: "replace",
        subjectAssociationId: "assoc1",
        effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "object1" } },
          { role: "marker", ref: { entityType: "marker", id: "marker2" } }
        ]
      }
    };
    const resR = await submitFactCommand({ auth, data: payloadReplace });
    expect(resR.success).toBe(true);

    // Errors
    const payloadForeignMarker = {
      commandId: "123e4567-e89b-42d3-a456-426614174004",
      factType: "association",
      data: {
        operation: "attach",
        effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "object1" } },
          { role: "marker", ref: { entityType: "marker", id: "marker-other" } }
        ]
      }
    };
    await expect(submitFactCommand({ auth, data: payloadForeignMarker })).rejects.toThrow(/does not belong to you/);
    
    const payloadAlreadyDetached = {
      commandId: "123e4567-e89b-42d3-a456-426614174005",
      factType: "association",
      data: {
        operation: "detach",
        subjectAssociationId: "assoc1_already_detached", // mock duplicate check returns true
        effectiveAt: "2026-07-12T05:00:00Z", provenance: { source: "user_confirmed", confidence: "high" },
        participants: [
          { role: "object", ref: { entityType: "object", id: "object1" } },
          { role: "marker", ref: { entityType: "marker", id: "marker1" } }
        ]
      }
    };
    await expect(submitFactCommand({ auth, data: payloadAlreadyDetached })).rejects.toThrow(/already detached or replaced/);
  });
});
