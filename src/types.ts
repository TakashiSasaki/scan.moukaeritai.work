export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

import { Timestamp } from 'firebase/firestore';

export type ObservationObserverKind = 'user' | 'device' | 'system';

export type ObservationSource =
  | 'nfc'
  | 'qr'
  | 'manual'
  | 'barcode'
  | 'ble'
  | 'camera'
  | 'gateway'
  | 'import';

export type ObservationType = 'sighting' | 'scan' | 'proximity' | 'gateway_seen' | 'imported';

export type ObservationVisibility = 'private' | 'linked_object' | 'community' | 'public';

export type ObjectVisibility = 'private' | 'link_shared' | 'community_visible' | 'public_readable';

export interface ObservationLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export type IdentifierDiscoveryState = 'observed' | 'registered' | 'detached' | 'unknown';

/**
 * Legacy/current implementation type.
 * Conceptually maps to ObservationDoc with observationType = "marker_observed".
 */
export type IdentifierObservationRecord = {
  /**
   * observationId must equal document ID.
   * Normal client-created observations should use UUIDv7.
   * Imported/synthetic observations should use deterministic IDs.
   */
  observationId: string;
  identifierKey: string;
  /**
   * The owner/scope boundary for the observation record.
   * Distinct from observerUid (the actual reporting/scanning user),
   * though currently they are often the same for ordinary user observations.
   * Existing pre-ownerId observations may lack this field.
   * New observation writes should include it.
   */
  ownerId?: string;
  /**
   * Observations are evidence/log records, not canonical object state.
   */
  observedAt: Timestamp;
  receivedAt: Timestamp;
  source: ObservationSource;
  observationType: ObservationType;
  createdAt: Timestamp;

  /**
   * objectId is optional. Observations can exist before an object is registered.
   */
  objectId?: string;
  placeLabel?: string;
  location?: ObservationLocation;
  note?: string;
  metadata?: Record<string, unknown>;
  visibility?: ObservationVisibility;
  schemaVersion?: number;
} & (
  | {
      observerKind: 'user';
      observerUid: string;
      observerIsAnonymous?: boolean;
      observerDeviceId?: string;
    }
  | {
      observerKind: 'device' | 'system';
      observerUid?: string;
      observerIsAnonymous?: boolean;
      observerDeviceId?: string;
    }
);

/**
 * Legacy/current implementation type.
 * Conceptually maps to ObjectDoc.
 * Currently contains denormalized legacy/current fields such as currentLocation and identifierSummary;
 * these should migrate toward Measurement/Summary in future PRs.
 */
export interface ObjectRecord {
  objectId: string; // Must equal document ID
  ownerId: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'lost' | 'disposed';
  /**
   * Legacy/current implementation.
   * Conceptually maps to a future MeasurementDoc or ObjectSummaryDoc.currentPosition.
   */
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
    updatedAt?: Timestamp;
  };
  primaryImageId?: string;
  primaryImageUrl?: string;
  identifierSummary?: {
    activeKinds: string[];
    activeIdentifierCount: number;
    hasQr: boolean;
    hasNfc: boolean;
  };
  legacy?: {
    sourceCollection: 'items';
    legacyItemId: string;
  };
  createdBy?: string;
  ownerUid?: string;
  visibility?: ObjectVisibility;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  lastReportedAt?: Timestamp;
  lastReportedBy?: string;
  lastReportedLocation?: ObservationLocation;
  lastReportedPlaceLabel?: string;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  createdAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  updatedAt: Timestamp;
}

/**
 * Legacy/current implementation type.
 * Conceptually maps to MarkerDoc.
 */
export interface IdentifierRecord {
  identifierKey: string; // Must equal document ID
  ownerId: string;
  objectId?: string; // Optional if unassigned
  kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
  scheme: string; // e.g., "qr-url-token", "nfc-uid"
  rawValue?: string;
  rawPayload?: JsonValue;
  identityModelVersion?: 1 | 2;
  identitySchemaVersion?: number;
  canonicalizationVersion?: number;
  canonicalValue: string;
  status: 'active' | 'unassigned' | 'retired' | 'lost' | 'replaced';
  label?: string;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  /** Legacy/current implementation. Maps conceptually to oldest ObservationDoc. */
  firstObservedAt?: Timestamp;
  firstObservedBy?: string;
  firstObservationId?: string;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  /** Legacy/current implementation. Maps conceptually to newest ObservationDoc or MarkerSummaryDoc. */
  lastObservedAt?: Timestamp;
  lastObservedBy?: string;
  lastObservationId?: string;
  lastObservedSource?: ObservationSource;
  discoveryState?: IdentifierDiscoveryState;
  schemaVersion?: number;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  createdAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  updatedAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  /** Legacy/current implementation. Maps conceptually to newest ObservationDoc or MarkerSummaryDoc. */
  lastSeenAt?: Timestamp;
}

/**
 * Legacy/current implementation type.
 * Conceptually maps to AssociationDoc with associationType = "object_has_marker".
 * Note:
 *   objectIdentifierBindings conceptually maps to associations.
 *   identifiers conceptually maps to markers.
 */
export interface ObjectIdentifierBindingRecord {
  bindingId: string; // Must equal document ID
  ownerId: string;
  objectId: string;
  identifierKey: string;
  status: 'active' | 'detached' | 'replaced';
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  /** Legacy/current implementation. Conceptually domain time belonging to AssociationDoc. */
  attachedAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  /** Legacy/current implementation. Conceptually domain time belonging to AssociationDoc. */
  detachedAt?: Timestamp;
  attachedBy: string;
  detachedBy?: string;
  note?: string;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  createdAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  updatedAt: Timestamp;
}

/**
 * Legacy/current implementation type.
 * Current runtime event implementation and maps conceptually to EventDoc.
 */
export interface ObjectEventRecord {
  eventId: string; // Must equal document ID
  ownerId: string;
  objectId?: string;
  identifierKey?: string;
  type:
    | 'created'
    | 'updated'
    | 'scanned'
    | 'located'
    | 'image_added'
    | 'image_removed'
    | 'identifier_attached'
    | 'identifier_detached'
    | 'identifier_replaced'
    | 'migrated';
  occurredAt: Timestamp;
  actorUid: string;
  source?: 'qr' | 'nfc' | 'manual' | 'camera' | 'system' | 'migration';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ObjectImageRecord {
  imageId: string; // Must equal document ID
  ownerId: string;
  objectId: string;
  role: 'primary' | 'context' | 'label' | 'detail';
  storagePath?: string;
  downloadUrl?: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  createdAt: Timestamp;
  createdBy: string;
  legacy?: {
    sourceField: 'mainImageUrl' | 'contextImageUrls';
    sourceUrl?: string;
  };
}

export interface UserSettings {
  imageFormat?: 'webp' | 'jpeg';
  compressionQuality?: number;
  maxResolution?: number;
}

// Keep LegacyItem for migration script types
export interface LegacyItem {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  mainImageUrl?: string;
  contextImageUrls: string[];
  bluetoothTags: BluetoothTag[];
  tagType: 'qr' | 'nfc' | 'none';
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  createdAt: Timestamp;
  /** TODO(Migration): Domain time conceptually belongs to Fact or Projection records, not Entity directly. */
  updatedAt: Timestamp;
}

// Keep BluetoothTag for legacy compatibility
export interface BluetoothTag {
  name: string;
  id: string;
  rssi?: number;
  linkedAt?: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
