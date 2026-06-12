import {
  Timestamp,
  MarkerDoc,
  AssociationDoc,
  ObservationDoc,
  MeasurementDoc,
  EventDoc,
  ObjectSummaryDoc,
  MarkerSummaryDoc,
  PlaceSummaryDoc,
  Participant,
  FactProvenance
} from '../types/entityFactProjection';
import { buildFactIndexFields } from './factParticipants';
import { stripUndefinedDeep } from '../../packages/efp-model/src/serialization';

// -----------------------------------------------------------------------------
// Write Descriptor
// -----------------------------------------------------------------------------

export type EntityFactProjectionWrite<T> = {
  collection: string;
  id: string;
  path: string;
  data: T;
};

// -----------------------------------------------------------------------------
// Deterministic ID Helpers
// -----------------------------------------------------------------------------

export function safeIdPart(id: string): string {
  let safe = String(id).trim();
  safe = safe.replace(/[^A-Za-z0-9_-]/g, '_');
  safe = safe.replace(/_+/g, '_');
  safe = safe.replace(/^_|_$/g, '');
  if (!safe) return 'unknown';
  return safe;
}

export function buildObjectHasMarkerAssociationId(objectId: string, markerKey: string): string {
  return `object_has_marker__${safeIdPart(objectId)}__${safeIdPart(markerKey)}`;
}

export function buildObjectHasMarkerDetachedAssociationId(
  objectId: string,
  markerKey: string,
  transitionId: string
): string {
  return `object_has_marker_detached__${safeIdPart(objectId)}__${safeIdPart(markerKey)}__${safeIdPart(transitionId)}`;
}

export function buildObjectHasMarkerActiveTransitionAssociationId(
  objectId: string,
  markerKey: string,
  transitionId: string
): string {
  return `object_has_marker_active__${safeIdPart(objectId)}__${safeIdPart(markerKey)}__${safeIdPart(transitionId)}`;
}

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

export function buildMarkerWrite(marker: MarkerDoc): EntityFactProjectionWrite<MarkerDoc> {
  const cleanMarker = stripUndefinedDeep(marker);
  return {
    collection: 'markers',
    id: cleanMarker.markerKey,
    path: `markers/${cleanMarker.markerKey}`,
    data: cleanMarker
  };
}

export type BuildMarkerFromIdentifierInput = {
  markerKey: string;
  ownerId?: string;
  kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
  scheme: string;
  canonicalValue: string;
  rawValue?: string;
  rawPayload?: any; // any or JsonValue, but keeping simple here
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function buildMarkerWriteFromIdentifierInput(input: BuildMarkerFromIdentifierInput): EntityFactProjectionWrite<MarkerDoc> {
  let medium: MarkerDoc['medium'] = 'unknown';
  let mediumSubtype: string | undefined;
  let payloadLayer: MarkerDoc['payloadLayer'] = 'encoded_payload';
  let nativeId: MarkerDoc['nativeId'] | undefined;

  switch (input.kind) {
    case 'qr':
      medium = 'visual_code';
      mediumSubtype = 'qr';
      payloadLayer = 'encoded_payload';
      break;
    case 'barcode':
      medium = 'visual_code';
      mediumSubtype = 'barcode';
      payloadLayer = 'encoded_payload';
      break;
    case 'nfc':
      medium = 'nfc';
      if (input.scheme === 'nfc-uid' || input.scheme === 'felica-idm') {
        payloadLayer = 'native_carrier_id';
        if (input.scheme === 'felica-idm') {
           nativeId = { kind: 'felica_idm', normalizedValue: input.canonicalValue };
        } else {
           nativeId = { kind: 'unknown', normalizedValue: input.canonicalValue };
        }
      } else {
        payloadLayer = 'encoded_payload';
      }
      break;
    case 'manual':
      medium = 'manual';
      payloadLayer = 'manual_input';
      break;
    case 'bluetooth':
      medium = 'bluetooth';
      payloadLayer = 'radio_signal';
      break;
  }

  const legacy: Record<string, unknown> = {};
  if (input.rawValue !== undefined) {
    legacy.rawValue = input.rawValue;
  }
  if (input.rawPayload !== undefined) {
    legacy.rawPayload = input.rawPayload;
  }

  const marker: MarkerDoc = {
    markerKey: input.markerKey,
    ownerId: input.ownerId,
    medium,
    mediumSubtype,
    payloadLayer,
    payloadKind: input.scheme,
    canonicalPayload: input.canonicalValue,
    nativeId,
    stability: 'unknown',
    _meta: {
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
    legacy: Object.keys(legacy).length > 0 ? legacy : undefined
  };

  return buildMarkerWrite(marker);
}

export function buildAssociationWrite(input: {
  associationId: string;
  associationType: string;
  participants: Participant[];
  validFrom?: Timestamp;
  validUntil?: Timestamp;
  status?: string;
  provenance?: FactProvenance;
  note?: string;
  meta?: MarkerDoc['_meta'];
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<AssociationDoc> {
  const indexFields = buildFactIndexFields(input.participants);

  const doc: AssociationDoc = {
    associationId: input.associationId,
    associationType: input.associationType,
    participants: input.participants,
    ...indexFields,
    time: {
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    },
    status: input.status,
    provenance: input.provenance,
    note: input.note,
    _meta: input.meta,
    legacy: input.legacy,
  };

  const cleanDoc = stripUndefinedDeep(doc);

  return {
    collection: 'associations',
    id: input.associationId,
    path: `associations/${input.associationId}`,
    data: cleanDoc
  };
}

export function buildObjectHasMarkerAssociationWrite(input: {
  associationId: string;
  objectId: string;
  markerKey: string;
  ownerId?: string;
  validFrom?: Timestamp;
  validUntil?: Timestamp;
  status?: 'active' | 'detached' | 'replaced' | string;
  actorUid?: string;
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<AssociationDoc> {
  const participants: Participant[] = [
    { role: 'object', ref: { entityType: 'object', id: input.objectId } },
    { role: 'marker', ref: { entityType: 'marker', id: input.markerKey } }
  ];

  let provenance: FactProvenance;
  if (input.actorUid) {
    provenance = { source: 'user_confirmed', confidence: 'confirmed', actorUid: input.actorUid };
  } else {
    provenance = { source: 'legacy_mapping', confidence: 'high' };
  }

  const associationStatus = input.status === 'replaced' ? 'superseded' : (input.status || 'active');

  let legacyData = input.legacy ? { ...input.legacy } : {};
  if (input.ownerId !== undefined && legacyData.ownerId === undefined) {
    legacyData.ownerId = input.ownerId;
  }

  return buildAssociationWrite({
    associationId: input.associationId,
    associationType: 'object_has_marker',
    participants,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    status: associationStatus,
    provenance,
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  });
}

export function buildObjectHasMarkerDetachedAssociationWrite(input: {
  associationId: string;
  objectId: string;
  markerKey: string;
  ownerId?: string;
  detachedAt: Timestamp;
  attachedAt?: Timestamp;
  actorUid?: string;
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<AssociationDoc> {
  return buildObjectHasMarkerAssociationWrite({
    associationId: input.associationId,
    objectId: input.objectId,
    markerKey: input.markerKey,
    ownerId: input.ownerId,
    validFrom: input.attachedAt,
    validUntil: input.detachedAt,
    status: 'detached',
    actorUid: input.actorUid,
    legacy: input.legacy,
  });
}

export function buildObjectHasMarkerActiveTransitionAssociationWrite(input: {
  associationId: string;
  objectId: string;
  markerKey: string;
  ownerId?: string;
  attachedAt: Timestamp;
  actorUid?: string;
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<AssociationDoc> {
  return buildObjectHasMarkerAssociationWrite({
    associationId: input.associationId,
    objectId: input.objectId,
    markerKey: input.markerKey,
    ownerId: input.ownerId,
    validFrom: input.attachedAt,
    status: 'active',
    actorUid: input.actorUid,
    legacy: input.legacy,
  });
}

export function buildObservationWrite(input: {
  observationId: string;
  observationType: string;
  participants: Participant[];
  observedAt: Timestamp;
  receivedAt?: Timestamp;
  source?: string;
  provenance?: FactProvenance;
  note?: string;
  payload?: Record<string, unknown>;
  meta?: MarkerDoc['_meta'];
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<ObservationDoc> {
  const indexFields = buildFactIndexFields(input.participants);

  const doc: ObservationDoc = {
    observationId: input.observationId,
    observationType: input.observationType,
    participants: input.participants,
    ...indexFields,
    time: {
      observedAt: input.observedAt,
      receivedAt: input.receivedAt,
    },
    source: input.source,
    provenance: input.provenance,
    note: input.note,
    payload: input.payload,
    _meta: input.meta,
    legacy: input.legacy,
  };

  const cleanDoc = stripUndefinedDeep(doc);

  return {
    collection: 'observations',
    id: input.observationId,
    path: `observations/${input.observationId}`,
    data: cleanDoc
  };
}

export function buildMarkerObservedWrite(input: {
  observationId: string;
  markerKey: string;
  objectId?: string;
  actorUid?: string;
  deviceId?: string;
  observedAt: Timestamp;
  receivedAt?: Timestamp;
  source: 'qr' | 'nfc' | 'manual' | 'barcode' | 'ble' | 'camera' | 'gateway' | 'import' | string;
  payload?: Record<string, unknown>;
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<ObservationDoc> {
  const participants: Participant[] = [
    { role: 'marker', ref: { entityType: 'marker', id: input.markerKey } }
  ];

  if (input.objectId) {
    participants.push({ role: 'object', ref: { entityType: 'object', id: input.objectId } });
  }
  if (input.actorUid) {
    participants.push({ role: 'user', ref: { entityType: 'user', id: input.actorUid } });
  }
  if (input.deviceId) {
    participants.push({ role: 'device', ref: { entityType: 'device', id: input.deviceId } });
  }

  return buildObservationWrite({
    observationId: input.observationId,
    observationType: 'marker_observed',
    participants,
    observedAt: input.observedAt,
    receivedAt: input.receivedAt,
    source: input.source,
    provenance: { source: 'marker_observation', confidence: 'high' },
    payload: input.payload,
    legacy: input.legacy,
  });
}

export function buildMeasurementWrite(input: {
  measurementId: string;
  measurementType: string;
  participants: Participant[];
  measuredAt: Timestamp;
  receivedAt?: Timestamp;
  provenance?: FactProvenance;
  position?: MeasurementDoc['position'];
  place?: MeasurementDoc['place'];
  signal?: MeasurementDoc['signal'];
  note?: string;
  meta?: MarkerDoc['_meta'];
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<MeasurementDoc> {
  const indexFields = buildFactIndexFields(input.participants);

  const doc: MeasurementDoc = {
    measurementId: input.measurementId,
    measurementType: input.measurementType,
    participants: input.participants,
    ...indexFields,
    time: {
      measuredAt: input.measuredAt,
      receivedAt: input.receivedAt,
    },
    provenance: input.provenance,
    position: input.position,
    place: input.place,
    signal: input.signal,
    note: input.note,
    _meta: input.meta,
    legacy: input.legacy,
  };

  const cleanDoc = stripUndefinedDeep(doc);

  return {
    collection: 'measurements',
    id: input.measurementId,
    path: `measurements/${input.measurementId}`,
    data: cleanDoc
  };
}

export function buildObjectLocationMeasurementWrite(input: {
  measurementId: string;
  objectId: string;
  actorUid?: string;
  deviceId?: string;
  measuredAt: Timestamp;
  receivedAt?: Timestamp;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
  legacy?: Record<string, unknown>;
}): EntityFactProjectionWrite<MeasurementDoc> {
  const participants: Participant[] = [
    { role: 'object', ref: { entityType: 'object', id: input.objectId } }
  ];

  if (input.actorUid) {
    participants.push({ role: 'user', ref: { entityType: 'user', id: input.actorUid } });
  }
  if (input.deviceId) {
    participants.push({ role: 'device', ref: { entityType: 'device', id: input.deviceId } });
  }

  let legacyData = input.legacy ? { ...input.legacy } : {};
  if (input.address !== undefined) {
    // Preserve address under legacy because a reverse-geocoded address is measurement metadata,
    // not a canonical Place label.
    legacyData.address = input.address;
  }

  return buildMeasurementWrite({
    measurementId: input.measurementId,
    measurementType: 'gps_position',
    participants,
    measuredAt: input.measuredAt,
    receivedAt: input.receivedAt,
    position: {
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters
    },
    provenance: { source: 'location_measurement', confidence: 'high' },
    legacy: Object.keys(legacyData).length > 0 ? legacyData : undefined
  });
}

export function buildEventWrite(input: {
  eventId: string;
  eventType: EventDoc['eventType'];
  participants: Participant[];
  occurredAt: Timestamp;
  receivedAt?: Timestamp;
  provenance?: FactProvenance;
  note?: string;
  meta?: MarkerDoc['_meta'];
  legacy?: EventDoc['legacy'];
}): EntityFactProjectionWrite<EventDoc> {
  const indexFields = buildFactIndexFields(input.participants);

  const doc: EventDoc = {
    eventId: input.eventId,
    eventType: input.eventType,
    participants: input.participants,
    ...indexFields,
    time: {
      occurredAt: input.occurredAt,
      receivedAt: input.receivedAt,
    },
    provenance: input.provenance,
    note: input.note,
    _meta: input.meta,
    legacy: input.legacy,
  };

  const cleanDoc = stripUndefinedDeep(doc);

  return {
    collection: 'events',
    id: input.eventId,
    path: `events/${input.eventId}`,
    data: cleanDoc
  };
}

export function buildObjectSummaryWrite(summary: ObjectSummaryDoc): EntityFactProjectionWrite<ObjectSummaryDoc> {
  return {
    collection: 'objectSummaries',
    id: summary.objectId,
    path: `objectSummaries/${summary.objectId}`,
    data: stripUndefinedDeep(summary)
  };
}

export function buildMarkerSummaryWrite(summary: MarkerSummaryDoc): EntityFactProjectionWrite<MarkerSummaryDoc> {
  return {
    collection: 'markerSummaries',
    id: summary.markerKey,
    path: `markerSummaries/${summary.markerKey}`,
    data: stripUndefinedDeep(summary)
  };
}

export function buildPlaceSummaryWrite(summary: PlaceSummaryDoc): EntityFactProjectionWrite<PlaceSummaryDoc> {
  return {
    collection: 'placeSummaries',
    id: summary.placeId,
    path: `placeSummaries/${summary.placeId}`,
    data: stripUndefinedDeep(summary)
  };
}
