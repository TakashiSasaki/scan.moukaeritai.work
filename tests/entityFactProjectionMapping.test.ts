import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  IdentifierRecord,
  ObjectIdentifierBindingRecord,
  IdentifierObservationRecord,
  ObjectEventRecord,
  ObjectRecord
} from '../src/types';
import {
  legacyIdentifierToMarkerDoc,
  legacyIdentifierBindingToAssociationDoc,
  legacyIdentifierObservationToObservationDoc,
  legacyObjectEventToEventDoc,
  legacyObjectToObjectDoc,
  legacyObjectToObjectSummaryDoc
} from '../src/lib/entityFactProjectionMapping';

describe('entityFactProjectionMapping', () => {
  const dummyTimestamp = { seconds: 1234567890, nanoseconds: 0 } as Timestamp;

  describe('legacyIdentifierToMarkerDoc', () => {
    it('maps correctly and excludes domain time from top level', () => {
      const legacy: IdentifierRecord = {
        identifierKey: 'QR:URL:ABC',
        ownerId: 'USER-1',
        kind: 'qr',
        scheme: 'qr-url-token',
        canonicalValue: 'ABC',
        status: 'active',
        createdAt: dummyTimestamp,
        updatedAt: dummyTimestamp,
        firstObservedAt: dummyTimestamp,
      };

      const result = legacyIdentifierToMarkerDoc(legacy);

      expect(result.markerKey).toBe('QR:URL:ABC');
      expect(result.ownerId).toBe('USER-1');
      expect((result as any).firstObservedAt).toBeUndefined(); // Should not exist on Entity
      expect(result._meta?.createdAt).toBe(dummyTimestamp);
      expect(result.legacy?.legacyKind).toBe('qr');
    });
  });

  describe('legacyIdentifierBindingToAssociationDoc', () => {
    it('maps to an AssociationDoc', () => {
      const legacy: ObjectIdentifierBindingRecord = {
        bindingId: 'BIND-1',
        ownerId: 'USER-1',
        objectId: 'OBJ-1',
        identifierKey: 'MK-1',
        status: 'active',
        attachedAt: dummyTimestamp,
        attachedBy: 'USER-1',
        createdAt: dummyTimestamp,
        updatedAt: dummyTimestamp,
      };

      const result = legacyIdentifierBindingToAssociationDoc(legacy);

      expect(result.associationId).toBe('BIND-1');
      expect(result.associationType).toBe('object_has_marker');
      expect(result.time.attachedAt).toBe(dummyTimestamp);
      expect(result.objectIds).toEqual(['OBJ-1']);
      expect(result.markerKeys).toEqual(['MK-1']);
    });
  });

  describe('legacyIdentifierObservationToObservationDoc', () => {
    it('maps to an ObservationDoc', () => {
      const legacy: IdentifierObservationRecord = {
        observationId: 'OBS-1',
        identifierKey: 'MK-1',
        objectId: 'OBJ-1',
        ownerId: 'USER-1',
        observedAt: dummyTimestamp,
        receivedAt: dummyTimestamp,
        source: 'camera',
        observationType: 'sighting',
        createdAt: dummyTimestamp,
        observerKind: 'user',
        observerUid: 'USER-1',
      };

      const result = legacyIdentifierObservationToObservationDoc(legacy);

      expect(result.observationId).toBe('OBS-1');
      expect(result.observationType).toBe('marker_observed'); // Top level mapping
      expect(result.time.observedAt).toBe(dummyTimestamp);
      expect(result.markerKeys).toEqual(['MK-1']);
      expect(result.objectIds).toEqual(['OBJ-1']);
      expect(result.userIds).toEqual(['USER-1']);
      expect(result.legacy?.observationType).toBe('sighting'); // Preserved
    });
  });

  describe('legacyObjectEventToEventDoc', () => {
    it('maps event types correctly', () => {
      const legacy: ObjectEventRecord = {
        eventId: 'EVT-1',
        ownerId: 'USER-1',
        objectId: 'OBJ-1',
        type: 'identifier_attached',
        occurredAt: dummyTimestamp,
        actorUid: 'USER-1',
      };

      const result = legacyObjectEventToEventDoc(legacy);

      expect(result.eventId).toBe('EVT-1');
      expect(result.eventType).toBe('marker_attached_to_object'); // Mapped
      expect(result.time.occurredAt).toBe(dummyTimestamp);
      expect(result.objectIds).toEqual(['OBJ-1']);
      expect(result.userIds).toEqual(['USER-1']);
      expect(result.legacy?.legacyType).toBe('identifier_attached');
    });

    it('maps unknown types to custom', () => {
      const legacy: ObjectEventRecord = {
        eventId: 'EVT-2',
        ownerId: 'USER-1',
        objectId: 'OBJ-1',
        type: 'some_weird_type' as any,
        occurredAt: dummyTimestamp,
        actorUid: 'USER-1',
      };

      const result = legacyObjectEventToEventDoc(legacy);
      expect(result.eventType).toBe('custom');
      expect(result.legacy?.legacyType).toBe('some_weird_type');
    });
  });

  describe('legacyObjectToObjectDoc and Summary', () => {
    it('separates entity and projection', () => {
      const legacy: ObjectRecord = {
        objectId: 'OBJ-1',
        ownerId: 'USER-1',
        name: 'My Object',
        description: '',
        status: 'active',
        createdAt: dummyTimestamp,
        updatedAt: dummyTimestamp,
        currentLocation: {
          latitude: 10,
          longitude: 20,
        },
      };

      const entity = legacyObjectToObjectDoc(legacy);
      const summary = legacyObjectToObjectSummaryDoc(legacy);

      // Entity has no location
      expect((entity as any).currentLocation).toBeUndefined();
      expect(entity.objectId).toBe('OBJ-1');

      // Summary has location
      expect(summary.currentPosition?.latitude).toBe(10);
      expect(summary.objectId).toBe('OBJ-1');
    });
  });
});
