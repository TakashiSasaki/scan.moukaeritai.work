import { v7 as uuidv7 } from 'uuid';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  setDoc, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { ObjectRecord } from './objectTypes';

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function validateAndBuildObjectDoc(params: {
  name: string;
  description?: string;
  ownerId: string;
}) {
  const name = (params.name || '').trim();
  const description = (params.description || '').trim();

  if (!name) {
    throw new Error('Name is required');
  }
  if (name.length > 200) {
    throw new Error('Name must be 200 characters or less');
  }
  if (description.length > 1024) {
    throw new Error('Description must be 1024 characters or less');
  }
  if (!params.ownerId) {
    throw new Error('Owner ID is required');
  }

  const objectId = uuidv7();

  return {
    objectId,
    ownerId: params.ownerId,
    name,
    description,
    status: 'active' as const,
    _meta: {
      recordCreatedAt: serverTimestamp(),
      recordUpdatedAt: serverTimestamp(),
      recordCreatedBy: params.ownerId,
      recordUpdatedBy: params.ownerId,
      schemaVersion: 1
    }
  };
}

export async function createObject(params: {
  name: string;
  description?: string;
  ownerId: string;
}): Promise<ObjectRecord> {
  const docData = validateAndBuildObjectDoc(params);
  const docPath = `objects/${docData.objectId}`;

  try {
    const docRef = doc(db, 'objects', docData.objectId);
    await setDoc(docRef, docData);
    return docData as ObjectRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

export async function getObject(objectId: string): Promise<ObjectRecord | null> {
  const docPath = `objects/${objectId}`;
  try {
    const docRef = doc(db, 'objects', objectId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ObjectRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    throw error;
  }
}

export async function listMyObjects(ownerId: string): Promise<ObjectRecord[]> {
  const path = 'objects';
  try {
    const q = query(
      collection(db, 'objects'),
      where('ownerId', '==', ownerId)
    );
    const querySnapshot = await getDocs(q);
    const results: ObjectRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as ObjectRecord);
    });
    // クライアント側で単純に名前順（または作成時刻順）へ並べる
    return results.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}
