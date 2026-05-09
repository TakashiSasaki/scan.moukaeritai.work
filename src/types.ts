import { Timestamp } from 'firebase/firestore';

export interface Item {
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

export interface BluetoothTag {
  name: string;
  id: string;
  rssi?: number;
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
