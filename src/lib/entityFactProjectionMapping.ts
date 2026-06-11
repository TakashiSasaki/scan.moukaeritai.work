import {
  IdentifierRecord,
  ObjectIdentifierBindingRecord,
  IdentifierObservationRecord,
  ObjectEventRecord,
  ObjectRecord
} from '../types';
import {
  MarkerDoc,
  AssociationDoc,
  ObservationDoc,
  EventDoc,
  ObjectDoc,
  ObjectSummaryDoc
} from '../types/entityFactProjection';
import { buildFactIndexFields } from './factParticipants';

/**
 * Maps legacy IdentifierRecord to MarkerDoc.
 * Domain time (createdAt, updatedAt, firstObservedAt, etc.) is EXCLUDED from top-level properties.
 */
export function legacyIdentifierToMarkerDoc(identifier: IdentifierRecord): MarkerDoc & { payload?: any } {
  const legacyData: Record<string, unknown> = {
    sourceCollection: 'identifiers',
    legacyIdentifierKey: identifier.identifierKey,
    legacyKind: identifier.kind,
    legacyScheme: identifier.scheme,
    legacyCanonicalValue: identifier.canonicalValue,
    identityModelVersion: identifier.identityModelVersion,
    identitySchemaVersion: identifier.identitySchemaVersion,
    canonicalizationVersion: identifier.canonicalizationVersion,
    rawValue: identifier.rawValue,
    rawPayload: identifier.rawPayload,
    legacyObjectId: identifier.objectId,
    discoveryState: identifier.discoveryState,
    schemaVersion: identifier.schemaVersion,
  };

  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  const result: MarkerDoc & { payload?: any } = {
    markerKey: identifier.identifierKey,
    ownerId: identifier.ownerId,
    markerType: identifier.kind === 'bluetooth' ? 'ble' : identifier.kind,
    payload: {
      payloadKind: identifier.scheme,
      canonical: identifier.canonicalValue,
    },
    _meta: {
      createdAt: identifier.createdAt,
      updatedAt: identifier.updatedAt,
      schemaVersion: identifier.schemaVersion,
    },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };

  if (result._meta?.schemaVersion === undefined) delete result._meta.schemaVersion;

  return result;
}

/**
 * Maps legacy ObjectIdentifierBindingRecord to AssociationDoc.
 */
export function legacyIdentifierBindingToAssociationDoc(binding: ObjectIdentifierBindingRecord): AssociationDoc & { time: { startedAt?: any } } {
  const indexFields = buildFactIndexFields([
    { role: 'object', ref: { entityType: 'object', id: binding.objectId } },
    { role: 'marker', ref: { entityType: 'marker', id: binding.identifierKey } }
  ]);

  const legacyData: Record<string, unknown> = {
    sourceCollection: 'objectIdentifierBindings',
    attachedBy: binding.attachedBy,
    detachedBy: binding.detachedBy,
    ownerId: binding.ownerId,
  };
  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  const result: any = {
    ...indexFields,
    associationId: binding.bindingId,
    associationType: 'object_has_marker',
    time: {
      startedAt: binding.attachedAt,
      attachedAt: binding.attachedAt,
      detachedAt: binding.detachedAt,
    },
    status: binding.status === 'replaced' ? 'superseded' : binding.status,
    note: binding.note,
    _meta: {
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
      createdBy: binding.attachedBy,
    },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };

  if (result.time.detachedAt === undefined) delete result.time.detachedAt;
  if (result.note === undefined) delete result.note;
  if (result._meta.createdBy === undefined) delete result._meta.createdBy;

  return result;
}

/**
 * Maps legacy IdentifierObservationRecord to ObservationDoc.
 */
export function legacyIdentifierObservationToObservationDoc(observation: IdentifierObservationRecord): ObservationDoc {
  const participants = [
    { role: 'marker', ref: { entityType: 'marker', id: observation.identifierKey } }
  ] as Parameters<typeof buildFactIndexFields>[0];

  if (observation.objectId) {
    participants.push({ role: 'object', ref: { entityType: 'object', id: observation.objectId } });
  }

  const observerUid = (observation as any).observerUid;
  if (observerUid) {
    participants.push({ role: 'user', ref: { entityType: 'user', id: observerUid } });
  }

  const indexFields = buildFactIndexFields(participants);

  const legacyData: Record<string, unknown> = {
    sourceCollection: 'identifierObservations',
    ownerId: observation.ownerId,
    observationType: observation.observationType, // Original type (e.g. 'sighting')
    placeLabel: observation.placeLabel,
    location: observation.location,
    visibility: observation.visibility,
    observerKind: observation.observerKind,
    observerIsAnonymous: (observation as any).observerIsAnonymous,
    observerDeviceId: (observation as any).observerDeviceId,
  };
  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  const result: any = {
    ...indexFields,
    observationId: observation.observationId,
    observationType: 'marker_observed',
    time: {
      observedAt: observation.observedAt,
      receivedAt: observation.receivedAt,
    },
    source: observation.source,
    provenance: {
      source: 'legacy_observation',
      confidence: 'high'
    },
    note: observation.note,
    payload: observation.metadata, // Transferring metadata to payload
    _meta: {
      createdAt: observation.createdAt,
      schemaVersion: observation.schemaVersion,
      updatedAt: observation.createdAt, // Observation is append-only, but _meta requires updatedAt
    },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };

  if (result.time.receivedAt === undefined) delete result.time.receivedAt;
  if (result.note === undefined) delete result.note;
  if (result.payload === undefined) delete result.payload;
  if (result._meta.schemaVersion === undefined) delete result._meta.schemaVersion;

  return result;
}

/**
 * Maps legacy ObjectEventRecord to EventDoc.
 */
export function legacyObjectEventToEventDoc(event: ObjectEventRecord): EventDoc {
  const participants = [] as Parameters<typeof buildFactIndexFields>[0];

  if (event.objectId) {
    participants.push({ role: 'object', ref: { entityType: 'object', id: event.objectId } });
  }

  if (event.identifierKey) {
    participants.push({ role: 'marker', ref: { entityType: 'marker', id: event.identifierKey } });
  }

  if (event.actorUid) {
    participants.push({ role: 'user', ref: { entityType: 'user', id: event.actorUid } });
  }

  const indexFields = buildFactIndexFields(participants);

  let newEventType: string;
  switch (event.type) {
    case 'created': newEventType = 'object_created'; break;
    case 'updated': newEventType = 'object_updated'; break;
    case 'scanned': newEventType = 'object_scanned'; break;
    case 'located': newEventType = 'object_located'; break;
    case 'image_added': newEventType = 'object_image_added'; break;
    case 'image_removed': newEventType = 'object_image_removed'; break;
    case 'identifier_attached': newEventType = 'marker_attached_to_object'; break;
    case 'identifier_detached': newEventType = 'marker_detached_from_object'; break;
    case 'identifier_replaced': newEventType = 'marker_replaced_on_object'; break;
    case 'migrated': newEventType = 'imported'; break;
    default: newEventType = 'custom'; break;
  }

  const legacyData: Record<string, unknown> = {
    sourceCollection: 'objectEvents',
    legacyType: event.type,
    ownerId: event.ownerId,
    source: event.source,
    location: event.location,
    metadata: event.metadata,
  };
  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  return {
    ...indexFields,
    eventId: event.eventId,
    eventType: newEventType,
    time: {
      occurredAt: event.occurredAt,
    },
    _meta: {
      // EventDoc needs createdAt/updatedAt for _meta if we map strictly,
      // but ObjectEventRecord only has occurredAt. We use occurredAt.
      createdAt: event.occurredAt,
      updatedAt: event.occurredAt,
    },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };
}

/**
 * Maps legacy ObjectRecord to ObjectDoc.
 */
export function legacyObjectToObjectDoc(obj: ObjectRecord): ObjectDoc {
  const legacyData: Record<string, unknown> = {
    sourceCollection: 'objects',
    legacyObjectLegacyInfo: obj.legacy,
    createdBy: obj.createdBy,
    ownerUid: obj.ownerUid,
    visibility: obj.visibility,
  };
  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  const result: any = {
    objectId: obj.objectId,
    ownerId: obj.ownerId,
    name: obj.name,
    description: obj.description,
    status: obj.status,
    _meta: {
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };

  if (result.name === undefined) delete result.name;
  if (result.description === undefined) delete result.description;
  if (result.status === undefined) delete result.status;

  return result;
}

/**
 * Maps legacy ObjectRecord to ObjectSummaryDoc.
 */
export function legacyObjectToObjectSummaryDoc(obj: ObjectRecord): ObjectSummaryDoc {
  const legacyData: Record<string, unknown> = {
    sourceCollection: 'objects',
    identifierSummary: obj.identifierSummary,
    currentLocation: obj.currentLocation,
    lastReportedBy: obj.lastReportedBy,
    lastReportedLocation: obj.lastReportedLocation,
    lastReportedPlaceLabel: obj.lastReportedPlaceLabel,
  };
  Object.keys(legacyData).forEach(k => legacyData[k] === undefined && delete legacyData[k]);

  const result: any = {
    objectId: obj.objectId,
    // activeMarkerKeys cannot be reliably mapped directly from activeKinds (e.g. 'qr' is not a markerKey).
    // It should be derived properly via associations later.
    // We intentionally omit activeMarkerKeys here.
    lastObservedAt: obj.lastReportedAt,
    currentPosition: obj.currentLocation ? {
      latitude: obj.currentLocation.latitude,
      longitude: obj.currentLocation.longitude,
    } : undefined,
    asOf: obj.updatedAt,
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  };

  if (result.lastObservedAt === undefined) delete result.lastObservedAt;
  if (result.currentPosition === undefined) delete result.currentPosition;

  return result;
}
