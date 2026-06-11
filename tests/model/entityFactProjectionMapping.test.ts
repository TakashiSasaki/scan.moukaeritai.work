import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  legacyIdentifierToMarkerDoc,
  legacyIdentifierBindingToAssociationDoc,
  legacyIdentifierObservationToObservationDoc
} from '../../src/lib/entityFactProjectionMapping';
import {
  IdentifierRecord,
  ObjectIdentifierBindingRecord,
  IdentifierObservationRecord
} from '../../src/types';

describe('Entity Fact Projection Mapping', () => {
  it('should map IdentifierRecord to MarkerDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: IdentifierRecord = {
      identifierKey: 'QR:URL:ABC',
      ownerId: 'USER-1',
      kind: 'qr',
      scheme: 'url',
      canonicalValue: 'ABC',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierToMarkerDoc(legacy);

    expect(result.markerKey).toBe('QR:URL:ABC');
    expect(result.markerType).toBe('qr');
    expect(result.payload.payloadKind).toBe('url');
    expect(result.payload.canonical).toBe('ABC');
    expect(result._meta?.createdAt).toBe(timestamp);
    expect(result._meta?.updatedAt).toBe(timestamp);
  });

  it('should map bluetooth IdentifierRecord to ble MarkerDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: IdentifierRecord = {
      identifierKey: 'BT:MAC:123',
      ownerId: 'USER-1',
      kind: 'bluetooth',
      scheme: 'mac',
      canonicalValue: '123',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierToMarkerDoc(legacy);

    expect(result.markerType).toBe('ble');
  });

  it('should map ObjectIdentifierBindingRecord to AssociationDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: ObjectIdentifierBindingRecord = {
      bindingId: 'BINDING-1',
      ownerId: 'USER-1',
      objectId: 'OBJECT-1',
      identifierKey: 'QR:URL:ABC',
      status: 'active',
      attachedAt: timestamp,
      attachedBy: 'USER-1',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierBindingToAssociationDoc(legacy);

    expect(result.associationId).toBe('BINDING-1');
    expect(result.associationType).toBe('object_has_marker');
    expect(result.status).toBe('active');
    expect(result.participantKeys).toContain('object:OBJECT-1');
    expect(result.participantKeys).toContain('marker:QR:URL:ABC');
    expect(result.objectIds).toContain('OBJECT-1');
    expect(result.markerKeys).toContain('QR:URL:ABC');
    expect(result.time.startedAt).toBe(timestamp);
    expect(result._meta?.createdAt).toBe(timestamp);
    expect(result._meta?.createdBy).toBe('USER-1');
  });

  it('should map detached ObjectIdentifierBindingRecord to detached AssociationDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: ObjectIdentifierBindingRecord = {
      bindingId: 'BINDING-2',
      ownerId: 'USER-1',
      objectId: 'OBJECT-1',
      identifierKey: 'QR:URL:ABC',
      status: 'detached',
      attachedAt: timestamp,
      attachedBy: 'USER-1',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierBindingToAssociationDoc(legacy);
    expect(result.status).toBe('detached');
  });

  it('should map replaced ObjectIdentifierBindingRecord to superseded AssociationDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: ObjectIdentifierBindingRecord = {
      bindingId: 'BINDING-3',
      ownerId: 'USER-1',
      objectId: 'OBJECT-1',
      identifierKey: 'QR:URL:ABC',
      status: 'replaced',
      attachedAt: timestamp,
      attachedBy: 'USER-1',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierBindingToAssociationDoc(legacy);
    expect(result.status).toBe('superseded');
  });

  it('should map IdentifierObservationRecord to ObservationDoc', () => {
    const timestamp = Timestamp.now();
    const legacy: IdentifierObservationRecord = {
      observationId: 'OBSERVATION-1',
      identifierKey: 'QR:URL:ABC',
      observedAt: timestamp,
      receivedAt: timestamp,
      source: 'qr',
      observationType: 'sighting',
      createdAt: timestamp,
      objectId: 'OBJECT-1',
      observerKind: 'user',
      observerUid: 'USER-1'
    };

    const result = legacyIdentifierObservationToObservationDoc(legacy);

    expect(result.observationId).toBe('OBSERVATION-1');
    expect(result.observationType).toBe('marker_observed');
    expect(result.participantKeys).toContain('marker:QR:URL:ABC');
    expect(result.participantKeys).toContain('object:OBJECT-1');
    expect(result.participantKeys).toContain('user:USER-1');
    expect(result.objectIds).toContain('OBJECT-1');
    expect(result.userIds).toContain('USER-1');
    expect(result.markerKeys).toContain('QR:URL:ABC');
    expect(result.time.observedAt).toBe(timestamp);
    expect(result.time.receivedAt).toBe(timestamp);
    expect(result.source).toBe('qr');
    expect(result.provenance.confidence).toBe('high');
    expect(result._meta?.createdAt).toBe(timestamp);
  });
});