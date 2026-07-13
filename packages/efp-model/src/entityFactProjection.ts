import {
  JsonValue,
  EntityReference,
  Participant,
  Provenance,
  RecordMetadata,
  ObjectEntity,
  MarkerEntity,
  PlaceEntity,
  AssociationFact,
  ObservationFact,
  MeasurementFact,
  EventFact,
  ObjectSummaryProjection,
  MarkerSummaryProjection,
  PlaceSummaryProjection
} from './generated/types.js';

export * from './generated/types.js';

/**
 * Logical EFP Timestamp is represented as a string (RFC 3339 UTC).
 */
export type Timestamp = string;

export type PersistenceMeta = RecordMetadata;

export type EntityRef = EntityReference;

export type FactProvenanceSource = Provenance['source'] | string;

export type FactProvenance = Provenance;

export type FactIndexFields = {
  participantKeys: string[];
  objectIds: string[];
  markerKeys: string[];
  placeIds: string[];
  readerIds: string[];
  deviceIds: string[];
  userIds: string[];
};

// Map old document types to generated contract types with optional legacy fields for backward compatibility.
export type ObjectDoc = ObjectEntity & { legacy?: Record<string, any> };
export type MarkerDoc = MarkerEntity & { legacy?: Record<string, any> };
export type PlaceDoc = PlaceEntity & { legacy?: Record<string, any> };

export type AssociationDoc = AssociationFact & FactIndexFields & { legacy?: Record<string, any> };
export type ObservationDoc = ObservationFact & FactIndexFields & { legacy?: Record<string, any> };
export type MeasurementDoc = MeasurementFact & FactIndexFields & { legacy?: Record<string, any> };
export type EventDoc = EventFact & FactIndexFields & { legacy?: Record<string, any> };

export type ObjectSummaryDoc = ObjectSummaryProjection & { legacy?: Record<string, any> };
export type MarkerSummaryDoc = MarkerSummaryProjection & { legacy?: Record<string, any> };
export type PlaceSummaryDoc = PlaceSummaryProjection & { legacy?: Record<string, any> };
