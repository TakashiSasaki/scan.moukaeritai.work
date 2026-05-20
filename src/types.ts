import { Timestamp } from 'firebase/firestore';

export interface ObjectRecord {
  objectId: string; // Must equal document ID
  ownerId: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'lost' | 'disposed';
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    updatedAt?: Timestamp;
  };
  primaryImageId?: string;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IdentifierRecord {
  identifierKey: string; // Must equal document ID
  ownerId: string;
  objectId?: string; // Optional if unassigned
  kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
  scheme: string; // e.g., "qr-url-token", "nfc-uid"
  rawValue?: string;
  canonicalValue: string;
  status: 'active' | 'unassigned' | 'retired' | 'lost' | 'replaced';
  label?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt?: Timestamp;
}

export interface ObjectIdentifierBindingRecord {
  bindingId: string; // Must equal document ID
  ownerId: string;
  objectId: string;
  identifierKey: string;
  status: 'active' | 'detached' | 'replaced';
  attachedAt: Timestamp;
  detachedAt?: Timestamp;
  attachedBy: string;
  detachedBy?: string;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  createdAt: Timestamp;
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
