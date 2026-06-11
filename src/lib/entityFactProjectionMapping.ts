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
  return {
    markerKey: legacy.identifierKey,
    markerType: legacy.kind === 'bluetooth' ? 'ble' : legacy.kind,
    payload: {
      payloadKind: legacy.scheme,
      canonical: legacy.canonicalValue,
      raw: legacy.rawPayload
    },
    _meta: {
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt
    }
  };
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

  return {
    associationId: legacy.bindingId,
    associationType: 'object_has_marker',
    participants,
    participantKeys,
    objectIds: [legacy.objectId],
    markerKeys: [legacy.identifierKey],
    time: {
      startedAt: legacy.attachedAt,
      endedAt: legacy.detachedAt
    },
    provenance: {
      source: 'user_confirmed', // Defaulting to user confirmed for manual bindings
      confidence: 'confirmed'
    },
    note: legacy.note,
    _meta: {
      createdAt: legacy.createdAt,
      createdBy: legacy.attachedBy,
      updatedAt: legacy.updatedAt,
      updatedBy: legacy.detachedBy
    }
  };
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
  if (legacy.observerKind === 'user' && legacy.observerUid) {
    participants.push({
      role: 'user',
      ref: { entityType: 'user', id: legacy.observerUid }
    });
    participantKeys.push(`user:${legacy.observerUid}`);
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

  return {
    observationId: legacy.observationId,
    observationType: 'marker_observed',
    participants,
    participantKeys,
    objectIds: objectIds.length > 0 ? objectIds : undefined,
    markerKeys: [legacy.identifierKey],
    time: {
      observedAt: legacy.observedAt,
      receivedAt: legacy.receivedAt
    },
    source: legacy.source,
    provenance: {
      source: provenanceSource,
      confidence
    },
    note: legacy.note,
    _meta: {
      createdAt: legacy.createdAt
    }
  };
}
