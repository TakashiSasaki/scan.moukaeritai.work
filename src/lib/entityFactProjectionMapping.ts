import {
  MarkerDoc,
  AssociationDoc,
  ObservationDoc,
  Participant,
  FactProvenance
} from '../types/entityFactProjection';

import {
  IdentifierRecord,
  ObjectIdentifierBindingRecord,
  IdentifierObservationRecord
} from '../types';

export function legacyIdentifierToMarkerDoc(legacy: IdentifierRecord): MarkerDoc {
  const payload: MarkerDoc['payload'] = {
    payloadKind: legacy.scheme,
    canonical: legacy.canonicalValue
  };
  if (legacy.rawPayload !== undefined) {
    payload.raw = legacy.rawPayload;
  }

  const _meta: NonNullable<MarkerDoc['_meta']> = {};
  if (legacy.createdAt !== undefined) _meta.createdAt = legacy.createdAt;
  if (legacy.updatedAt !== undefined) _meta.updatedAt = legacy.updatedAt;

  const doc: MarkerDoc = {
    markerKey: legacy.identifierKey,
    markerType: legacy.kind === 'bluetooth' ? 'ble' : legacy.kind,
    payload
  };

  if (Object.keys(_meta).length > 0) {
    doc._meta = _meta;
  }

  return doc;
}

export function legacyIdentifierBindingToAssociationDoc(legacy: ObjectIdentifierBindingRecord): AssociationDoc {
  const participants: Participant[] = [
    {
      role: 'object',
      ref: { entityType: 'object', id: legacy.objectId }
    },
    {
      role: 'marker',
      ref: { entityType: 'marker', id: legacy.identifierKey }
    }
  ];

  const participantKeys = [
    `object:${legacy.objectId}`,
    `marker:${legacy.identifierKey}`
  ];

  let status: AssociationDoc['status'] = 'active';
  if (legacy.status === 'detached') {
    status = 'detached';
  } else if (legacy.status === 'replaced') {
    status = 'superseded';
  }

  const time: AssociationDoc['time'] = {};
  if (legacy.attachedAt !== undefined) time.startedAt = legacy.attachedAt;
  if (legacy.detachedAt !== undefined) time.endedAt = legacy.detachedAt;

  const _meta: NonNullable<AssociationDoc['_meta']> = {};
  if (legacy.createdAt !== undefined) _meta.createdAt = legacy.createdAt;
  if (legacy.attachedBy !== undefined) _meta.createdBy = legacy.attachedBy;
  if (legacy.updatedAt !== undefined) _meta.updatedAt = legacy.updatedAt;
  if (legacy.detachedBy !== undefined) _meta.updatedBy = legacy.detachedBy;

  const doc: AssociationDoc = {
    associationId: legacy.bindingId,
    associationType: 'object_has_marker',
    participants,
    status,
    participantKeys,
    objectIds: [legacy.objectId],
    markerKeys: [legacy.identifierKey],
    time,
    provenance: {
      source: 'user_confirmed', // Defaulting to user confirmed for manual bindings
      confidence: 'confirmed'
    }
  };

  if (legacy.note !== undefined) {
    doc.note = legacy.note;
  }
  if (Object.keys(_meta).length > 0) {
    doc._meta = _meta;
  }

  return doc;
}

export function legacyIdentifierObservationToObservationDoc(legacy: IdentifierObservationRecord): ObservationDoc {
  const participants: Participant[] = [
    {
      role: 'marker',
      ref: { entityType: 'marker', id: legacy.identifierKey }
    }
  ];

  const participantKeys = [`marker:${legacy.identifierKey}`];

  const objectIds: string[] = [];
  if (legacy.objectId) {
    participants.push({
      role: 'object',
      ref: { entityType: 'object', id: legacy.objectId }
    });
    participantKeys.push(`object:${legacy.objectId}`);
    objectIds.push(legacy.objectId);
  }

  // Handle observer identity
  const userIds: string[] = [];
  if (legacy.observerKind === 'user' && legacy.observerUid) {
    participants.push({
      role: 'user',
      ref: { entityType: 'user', id: legacy.observerUid }
    });
    participantKeys.push(`user:${legacy.observerUid}`);
    userIds.push(legacy.observerUid);
  }

  let provenanceSource: FactProvenance['source'] = 'user_report';
  let confidence: FactProvenance['confidence'] = 'medium';

  if (legacy.source === 'import') {
    provenanceSource = 'imported';
  } else if (legacy.source === 'nfc') {
    provenanceSource = 'web_nfc';
    confidence = 'high';
  } else if (legacy.source === 'qr') {
    confidence = 'high';
  }

  const time: ObservationDoc['time'] = {
    observedAt: legacy.observedAt
  };
  if (legacy.receivedAt !== undefined) {
    time.receivedAt = legacy.receivedAt;
  }

  const _meta: NonNullable<ObservationDoc['_meta']> = {};
  if (legacy.createdAt !== undefined) _meta.createdAt = legacy.createdAt;

  const doc: ObservationDoc = {
    observationId: legacy.observationId,
    observationType: 'marker_observed',
    participants,
    participantKeys,
    markerKeys: [legacy.identifierKey],
    time,
    source: legacy.source,
    provenance: {
      source: provenanceSource,
      confidence
    }
  };

  if (objectIds.length > 0) doc.objectIds = objectIds;
  if (userIds.length > 0) doc.userIds = userIds;
  if (legacy.note !== undefined) doc.note = legacy.note;
  if (Object.keys(_meta).length > 0) doc._meta = _meta;

  return doc;
}
