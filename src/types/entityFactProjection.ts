import { Timestamp } from 'firebase/firestore';

// -----------------------------------------------------------------------------
// Base / Utility Types
// -----------------------------------------------------------------------------

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type PersistenceMeta = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion?: number;
  createdBy?: string;
};

// -----------------------------------------------------------------------------
// References & Participants
// -----------------------------------------------------------------------------

export type EntityRef = {
  entityType: 'object' | 'marker' | 'place' | 'association' | 'observation' | 'measurement' | 'event' | 'user';
  id: string; // The generic ID (e.g. objectId, markerKey, placeId)
};

export type Participant = {
  role: 'object' | 'marker' | 'place' | 'device' | 'reader' | 'user' | string;
  ref: EntityRef;
};

export type FactIndexFields = {
  participants: Participant[];
  participantKeys: string[];
  objectIds?: string[];
  markerKeys?: string[];
  placeIds?: string[];
  readerIds?: string[];
  deviceIds?: string[];
  userIds?: string[];
};

export type FactProvenance = {
  source: string;
  confidence: 'confirmed' | 'high' | 'medium' | 'low' | 'unverified';
};

// -----------------------------------------------------------------------------
// Time Interfaces
// -----------------------------------------------------------------------------

export type AssociationTime = {
  attachedAt: Timestamp;
  detachedAt?: Timestamp;
};

export type ObservationTime = {
  observedAt: Timestamp;
  receivedAt?: Timestamp;
};

export type MeasurementTime = {
  measuredAt: Timestamp;
  receivedAt?: Timestamp;
};

export type EventTime = {
  occurredAt: Timestamp;
  receivedAt?: Timestamp;
};

// -----------------------------------------------------------------------------
// Entities (Timeless nodes)
// -----------------------------------------------------------------------------

export type ObjectDoc = {
  objectId: string;
  ownerId: string;
  name?: string;
  description?: string;
  status?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type MarkerDoc = {
  markerKey: string;
  ownerId: string;
  markerType?: string; // Replaces 'kind' or 'scheme' in the broader sense
  _meta?: PersistenceMeta;
  legacy?: {
    sourceCollection?: string;
    legacyIdentifierKey?: string;
    legacyKind?: string;
    legacyScheme?: string;
    legacyCanonicalValue?: string;
    identityModelVersion?: number;
    identitySchemaVersion?: number;
    canonicalizationVersion?: number;
    rawValue?: string;
    rawPayload?: JsonValue;
    legacyObjectId?: string;
    discoveryState?: string;
    schemaVersion?: number;
    [key: string]: unknown;
  };
};

export type PlaceDoc = {
  placeId: string;
  ownerId: string;
  label?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// Facts (Temporal nodes)
// -----------------------------------------------------------------------------

export type AssociationDoc = FactIndexFields & {
  associationId: string;
  associationType: 'object_has_marker' | string;
  time: AssociationTime;
  provenance?: FactProvenance;
  status?: 'active' | 'detached' | 'replaced' | string;
  note?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type ObservationDoc = FactIndexFields & {
  observationId: string;
  observationType: 'marker_observed' | 'sighting' | 'scan' | 'proximity' | 'gateway_seen' | 'imported' | string;
  time: ObservationTime;
  provenance?: FactProvenance;
  source?: string;
  note?: string;
  payload?: Record<string, unknown>;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type MeasurementDoc = FactIndexFields & {
  measurementId: string;
  measurementType:
    | 'location'
    | 'gps_position'
    | 'manual_place'
    | 'proximity'
    | 'ble_rssi'
    | 'rfid_read'
    | 'distance'
    | 'signal'
    | 'custom'
    | string;
  time: MeasurementTime;
  provenance?: FactProvenance;
  position?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracyMeters?: number;
  };
  place?: {
    placeId?: string;
    label?: string;
  };
  signal?: {
    rssi?: number;
    txPower?: number;
    distanceEstimateMeters?: number;
    protocol?: string;
    readerId?: string;
    antennaId?: string;
    gatewayId?: string;
  };
  note?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type EventDoc = FactIndexFields & {
  eventId: string;
  eventType:
    | 'object_created'
    | 'object_updated'
    | 'object_archived'
    | 'object_scanned'
    | 'object_located'
    | 'object_image_added'
    | 'object_image_removed'
    | 'marker_registered'
    | 'marker_retired'
    | 'marker_attached_to_object'
    | 'marker_detached_from_object'
    | 'marker_replaced_on_object'
    | 'association_created'
    | 'association_ended'
    | 'summary_recomputed'
    | 'imported'
    | 'custom'
    | string;
  time: EventTime;
  provenance?: FactProvenance;
  note?: string;
  _meta?: PersistenceMeta;
  legacy?: {
    sourceCollection?: string;
    legacyType?: string;
    [key: string]: unknown;
  };
};

// -----------------------------------------------------------------------------
// Projections (Summaries)
// -----------------------------------------------------------------------------

export type ObjectSummaryDoc = {
  objectId: string;
  currentPlaceId?: string;
  currentPosition?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  activeMarkerKeys?: string[];
  lastObservedAt?: Timestamp;
  lastMeasuredAt?: Timestamp;
  asOf: Timestamp;
  derivedFromFactIds?: string[];
  legacy?: Record<string, unknown>;
};

export type MarkerSummaryDoc = {
  markerKey: string;
  relatedObjectIds?: string[];
  lastObservedAt?: Timestamp;
  lastObservedPlaceId?: string;
  recentObservationCount?: number;
  asOf: Timestamp;
  derivedFromFactIds?: string[];
  legacy?: Record<string, unknown>;
};

export type PlaceSummaryDoc = {
  placeId: string;
  currentObjectIds?: string[];
  currentMarkerKeys?: string[];
  lastActivityAt?: Timestamp;
  asOf: Timestamp;
  derivedFromFactIds?: string[];
  legacy?: Record<string, unknown>;
};
