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
    expect(result.medium).toBe('visual_code');
    expect(result.mediumSubtype).toBe('qr');
    expect(result.payloadLayer).toBe('encoded_payload');
    expect(result.payloadKind).toBe('url');
    expect(result.canonicalPayload).toBe('ABC');
    expect(result.stability).toBe('unknown');
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

    expect(result.medium).toBe('bluetooth');
    expect(result.payloadLayer).toBe('radio_signal');
  });

  it('should map felica-idm IdentifierRecord to felica_idm NativeMarkerId', () => {
    const timestamp = Timestamp.now();
    const legacy: IdentifierRecord = {
      identifierKey: 'NFC:FELICA-IDM:ABC',
      ownerId: 'USER-1',
      kind: 'nfc',
      scheme: 'felica-idm',
      canonicalValue: 'ABC',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierToMarkerDoc(legacy);

    expect(result.nativeId?.kind).toBe('felica_idm');
    expect(result.nativeId?.normalizedValue).toBe('ABC');
  });

  it('should map nfc-uid IdentifierRecord to unknown NativeMarkerId', () => {
    const timestamp = Timestamp.now();
    const legacy: IdentifierRecord = {
      identifierKey: 'NFC:NFC-UID:XYZ',
      ownerId: 'USER-1',
      kind: 'nfc',
      scheme: 'nfc-uid',
      canonicalValue: 'XYZ',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = legacyIdentifierToMarkerDoc(legacy);

    expect(result.nativeId?.kind).toBe('unknown');
    expect(result.nativeId?.normalizedValue).toBe('XYZ');
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
    expect(result.time.validFrom).toBe(timestamp);
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

  it('should map legacy ObjectEventRecord to EventDoc', async () => {
    const timestamp = Timestamp.now();
    const legacy = {
      eventId: 'EV-1',
      ownerId: 'USER-1',
      objectId: 'OBJ-1',
      type: 'scanned',
      occurredAt: timestamp,
      actorUid: 'USER-1'
    } as any;
    const m = await import('../../src/lib/entityFactProjectionMapping');
    const res = m.legacyObjectEventToEventDoc(legacy);
    expect(res.eventType).toBe('object_scanned');
  });

  it('should map legacy ObjectRecord to ObjectDoc', async () => {
    const timestamp = Timestamp.now();
    const legacy = {
      objectId: 'OBJ-1',
      ownerId: 'USER-1',
      name: 'Thing',
      description: 'A thing',
      status: 'active',
      currentLocation: { latitude: 0, longitude: 0 },
      createdAt: timestamp,
      updatedAt: timestamp
    } as any;
    const m = await import('../../src/lib/entityFactProjectionMapping');
    const res = m.legacyObjectToObjectDoc(legacy);
    expect((res as any).currentLocation).toBeUndefined();
    expect(res._meta?.createdAt).toBe(timestamp);
  });

  it('should map legacy ObjectRecord to ObjectSummaryDoc', async () => {
    const timestamp = Timestamp.now();
    const legacy = {
      objectId: 'OBJ-1',
      ownerId: 'USER-1',
      name: 'Thing',
      description: 'A thing',
      status: 'active',
      currentLocation: { latitude: 10, longitude: 20 },
      createdAt: timestamp,
      updatedAt: timestamp
    } as any;
    const m = await import('../../src/lib/entityFactProjectionMapping');
    const res = m.legacyObjectToObjectSummaryDoc(legacy);
    expect(res.currentPosition?.latitude).toBe(10);
    expect(res.currentPosition?.longitude).toBe(20);
  });
});
