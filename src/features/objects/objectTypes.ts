export type ObjectStatus = 'active' | 'archived' | 'lost' | 'disposed';

export interface ObjectMeta {
  recordCreatedAt: any; // FieldValue on write, Timestamp/Date on read
  recordUpdatedAt: any;
  recordCreatedBy: string;
  recordUpdatedBy: string;
  schemaVersion: number;
}

export interface ObjectRecord {
  objectId: string;
  ownerId: string;
  name: string;
  description: string;
  status: ObjectStatus;
  _meta?: ObjectMeta;
}
