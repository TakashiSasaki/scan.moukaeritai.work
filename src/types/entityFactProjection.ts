import { Timestamp } from 'firebase/firestore';

export type EntityRef = {
  entityType: 'object' | 'marker' | 'place' | 'reader' | 'device' | 'user' | 'observation' | 'measurement' | 'event';
  id: string;
};

export type Participant = {
  role: string;
  ref: EntityRef;
};

export type FactProvenance = {
  source: 'user_report' | 'user_confirmed' | 'device_gps' | 'web_nfc' | 'trusted_reader' | 'untrusted_reader' | 'system' | 'imported';
  confidence: 'confirmed' | 'high' | 'medium' | 'low';
};

export type FactIndexFields = {
  participantKeys: string[];
  objectIds?: string[];
  markerKeys?: string[];
  placeIds?: string[];
  deviceIds?: string[];
  readerIds?: string[];
};

export type PersistenceMeta = {
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
};

export type ObjectDoc = {
  objectId: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'lost' | 'disposed';
  _meta?: PersistenceMeta;
};

export type MarkerDoc = {
  markerKey: string;
  markerType: 'qr' | 'nfc' | 'ble' | 'barcode' | 'manual' | 'uhf_rfid';
  payload: {
    payloadKind: string;
    canonical: string;
    raw?: unknown;
  };
  _meta?: PersistenceMeta;
};

export type PlaceDoc = {
  placeId: string;
  name: string;
  description: string;
  boundary?: {
    type: 'polygon' | 'radius';
    coordinates: number[][];
  };
  _meta?: PersistenceMeta;
};

export type AssociationTime = {
  startedAt?: Timestamp;
  endedAt?: Timestamp;
};

export type AssociationDoc = FactIndexFields & {
  associationId: string;
  associationType: 'object_has_marker' | 'object_in_place' | 'marker_in_place' | 'reader_in_place' | 'custom';
  participants: Participant[];
  time: AssociationTime;
  provenance: FactProvenance;
  note?: string;
  _meta?: PersistenceMeta;
};

export type ObservationTime = {
  observedAt: Timestamp;
  receivedAt?: Timestamp;
};

export type ObservationDoc = FactIndexFields & {
  observationId: string;
  observationType: 'marker_observed' | 'object_sighted' | 'place_visited' | 'custom';
  participants: Participant[];
  time: ObservationTime;
  source: 'nfc' | 'qr' | 'manual' | 'barcode' | 'ble' | 'camera' | 'gateway' | 'import' | 'web_nfc';
  payload?: {
    payloadKind: string;
    canonical: string;
    raw?: unknown;
  };
  provenance: FactProvenance;
  note?: string;
  _meta?: PersistenceMeta;
};

export type MeasurementTime = {
  measuredAt: Timestamp;
};

export type MeasurementDoc = FactIndexFields & {
  measurementId: string;
  measurementType: 'location' | 'gps_position' | 'manual_place' | 'proximity' | 'ble_rssi' | 'rfid_read' | 'distance' | 'signal' | 'custom';
  participants: Participant[];
  time: MeasurementTime;
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
  provenance: FactProvenance;
  note?: string;
  _meta?: PersistenceMeta;
};

export type EventTime = {
  occurredAt: Timestamp;
};

export type EventDoc = FactIndexFields & {
  eventId: string;
  eventType: 'object_created' | 'object_updated' | 'object_archived' | 'marker_registered' | 'marker_retired' | 'association_created' | 'association_ended' | 'summary_recomputed' | 'imported' | 'custom';
  participants: Participant[];
  time: EventTime;
  provenance: FactProvenance;
  note?: string;
  _meta?: PersistenceMeta;
};

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
};

export type MarkerSummaryDoc = {
  markerKey: string;
  relatedObjectIds?: string[];
  lastObservedAt?: Timestamp;
  lastObservedPlaceId?: string;
  recentObservationCount?: number;
  asOf: Timestamp;
  derivedFromFactIds?: string[];
};

export type PlaceSummaryDoc = {
  placeId: string;
  currentObjectIds?: string[];
  currentMarkerKeys?: string[];
  lastActivityAt?: Timestamp;
  asOf: Timestamp;
  derivedFromFactIds?: string[];
};
