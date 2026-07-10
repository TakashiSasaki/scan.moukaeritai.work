// -----------------------------------------------------------------------------
// Base / Utility Types
// -----------------------------------------------------------------------------

export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toMillis(): number;
  toDate(): Date;
  isEqual(other: Timestamp): boolean;
  valueOf(): string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

/**
 * PersistenceMeta represents underlying datastore implementation metadata, not domain time.
 * Properties like createdAt and updatedAt should not be confused with domain time fields
 * (like observedAt or validFrom) which belong to Fact records instead.
 */
export type PersistenceMeta = {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  schemaVersion?: number;
  createdBy?: string;
};

// -----------------------------------------------------------------------------
// References & Participants
// -----------------------------------------------------------------------------

export type EntityRef = {
  entityType: 'object' | 'marker' | 'place' | 'association' | 'observation' | 'measurement' | 'event' | 'user' | 'reader' | 'device';
  id: string; // The generic ID (e.g. objectId, markerKey, placeId)
};

export type Participant = {
  role: 'object' | 'marker' | 'place' | 'device' | 'reader' | 'user' | string;
  ref: EntityRef;
};

export type FactIndexFields = {
  participantKeys: string[];
  objectIds?: string[];
  markerKeys?: string[];
  placeIds?: string[];
  readerIds?: string[];
  deviceIds?: string[];
  userIds?: string[];
};

export type FactProvenanceSource =
  | 'user_confirmed'
  | 'user_report'
  | 'marker_observation'
  | 'location_measurement'
  | 'trusted_reader'
  | 'system_inference'
  | 'admin_import'
  | 'migration'
  | 'import'
  | 'legacy_observation'
  | 'legacy_event'
  | 'legacy_mapping';

export type FactProvenance = {
  source: FactProvenanceSource;
  confidence: 'confirmed' | 'high' | 'medium' | 'low' | 'unknown';
  actorUid?: string;
  sourceFactIds?: string[];
};

// -----------------------------------------------------------------------------
// Time Interfaces
// -----------------------------------------------------------------------------

export type AssociationTime = {
  validFrom?: Timestamp;
  validUntil?: Timestamp;
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
  /**
   * Conceptual model: ownerId is not part of entity identity.
   * Current implementation: ownerId may still be required by Firestore rules and owner-scoped runtime paths.
   * Migration direction: keep ownerId for compatibility now; do not include it in semantic identity.
   */
  ownerId: string;
  name?: string;
  description?: string;
  status?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type MarkerMedium =
  | 'visual_code'
  | 'nfc'
  | 'rfid'
  | 'bluetooth'
  | 'manual'
  | 'visual_recognition'
  | 'unknown';

export type MarkerPayloadLayer =
  | 'encoded_payload'
  | 'native_carrier_id'
  | 'radio_signal'
  | 'connected_payload'
  | 'derived_fingerprint'
  | 'manual_input';

export type MarkerStability =
  | 'stable'
  | 'semi_stable'
  | 'rotating'
  | 'session'
  | 'derived'
  | 'unknown';

export type NativeMarkerId = {
  kind:
    | 'iso14443_uid'
    | 'felica_idm'
    | 'iso15693_uid'
    | 'rfid_epc'
    | 'rfid_tid'
    | 'ble_public_address'
    | 'ble_random_static_address'
    | 'ble_resolvable_private_address'
    | 'ble_non_resolvable_private_address'
    | 'unknown';

  normalizedValue: string;
};

export type MarkerDoc = {
  markerKey: string;
  /**
   * Conceptual model: ownerId is not part of entity identity.
   * Current implementation: ownerId may still be required by Firestore rules and owner-scoped runtime paths.
   * Migration direction: keep ownerId for compatibility now; do not include it in semantic identity.
   */
  ownerId?: string;

  medium: MarkerMedium;
  mediumSubtype?: string;

  payloadLayer: MarkerPayloadLayer;
  payloadKind: string;
  canonicalPayload?: string;

  nativeId?: NativeMarkerId;

  stability: MarkerStability;

  privacy?: {
    trackingSensitive: boolean;
    userConsentRequired: boolean;
    allowBackgroundObservation: boolean;
  };

  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

export type PlaceDoc = {
  placeId: string;
  /**
   * Conceptual model: ownerId is not part of entity identity.
   * Current implementation: ownerId may still be required by Firestore rules and owner-scoped runtime paths.
   * Migration direction: keep ownerId for compatibility now; do not include it in semantic identity.
   */
  ownerId: string;
  label?: string;
  _meta?: PersistenceMeta;
  legacy?: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// Facts (Temporal nodes)
// -----------------------------------------------------------------------------

export type AssociationDoc = FactIndexFields & {
  participants: Participant[];
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
  participants: Participant[];
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
  participants: Participant[];
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
  participants: Participant[];
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
