import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, test, expect } from 'vitest';
import fs from 'fs';

let testEnv: RulesTestEnvironment;
const PROJECT_ID = 'moukaeritaid';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8081,
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe('Firestore Security Rules', () => {
  const ownerId = 'user-owner-123';
  const otherId = 'user-other-456';

  function getAuthenticatedContext(uid: string) {
    return testEnv.authenticatedContext(uid).firestore();
  }

  function getUnauthenticatedContext() {
    return testEnv.unauthenticatedContext().firestore();
  }

  // 1. Owner can create and read own Entity
  test('owner can create and read own Entity', async () => {
    const db = getAuthenticatedContext(ownerId);
    const objRef = doc(db, 'objects', 'obj-1');
    
    // Create
    await expect(
      setDoc(objRef, {
        objectId: 'obj-1',
        ownerId: ownerId,
        name: 'My Object',
        description: 'Test Object',
        status: 'active',
        _meta: {
          recordCreatedAt: serverTimestamp(),
          recordUpdatedAt: serverTimestamp(),
          recordCreatedBy: ownerId,
          recordUpdatedBy: ownerId,
          schemaVersion: 1
        }
      })
    ).resolves.not.toThrow();

    // Read
    await expect(getDoc(objRef)).resolves.not.toThrow();
  });

  // 2. Other user cannot read Entity
  test('other user cannot read Entity', async () => {
    // Setup - pre-seed as admin/system
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'objects', 'obj-1'), {
        objectId: 'obj-1',
        ownerId: ownerId,
        name: 'My Object',
        status: 'active'
      });
    });

    const db = getAuthenticatedContext(otherId);
    const objRef = doc(db, 'objects', 'obj-1');
    await expect(getDoc(objRef)).rejects.toThrow();
  });

  // 3. markerKey generation is independent of ownerId
  test('markerKey generation is independent of ownerId', async () => {
    const db = getAuthenticatedContext(ownerId);
    // Any marker ID, e.g. visual-123 (does not contain ownerId string)
    const markerRef = doc(db, 'markers', 'visual-123');
    await expect(
      setDoc(markerRef, {
        markerKey: 'visual-123',
        ownerId: ownerId,
        medium: 'visual_code',
        payloadLayer: 'encoded_payload',
        payloadKind: 'qr_url',
        stability: 'stable',
        _meta: {
          recordCreatedAt: serverTimestamp(),
          recordUpdatedAt: serverTimestamp(),
          recordCreatedBy: ownerId,
          recordUpdatedBy: ownerId,
          schemaVersion: 1
        }
      })
    ).resolves.not.toThrow();
  });

  // 4. Fact update is denied
  test('Fact update is denied', async () => {
    // Setup
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'associations', 'assoc-1'), {
        associationId: 'assoc-1',
        associationType: 'object_has_marker',
        userIds: [ownerId],
        participants: [],
        participantKeys: []
      });
    });

    const db = getAuthenticatedContext(ownerId);
    const assocRef = doc(db, 'associations', 'assoc-1');
    await expect(
      updateDoc(assocRef, {
        status: 'detached'
      })
    ).rejects.toThrow();
  });

  // 5. Fact delete is denied
  test('Fact delete is denied', async () => {
    // Setup
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'associations', 'assoc-1'), {
        associationId: 'assoc-1',
        associationType: 'object_has_marker',
        userIds: [ownerId],
        participants: [],
        participantKeys: []
      });
    });

    const db = getAuthenticatedContext(ownerId);
    const assocRef = doc(db, 'associations', 'assoc-1');
    await expect(deleteDoc(assocRef)).rejects.toThrow();
  });

  // 6. Projection client write is denied
  test('Projection client write is denied', async () => {
    const db = getAuthenticatedContext(ownerId);
    const summaryRef = doc(db, 'objectSummaries', 'obj-1');
    await expect(
      setDoc(summaryRef, {
        objectId: 'obj-1',
        asOf: new Date().toISOString()
      })
    ).rejects.toThrow();
  });

  // 7. Projection owner read is allowed
  test('Projection owner read is allowed', async () => {
    // Setup
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'objects', 'obj-1'), {
        objectId: 'obj-1',
        ownerId: ownerId
      });
      await setDoc(doc(db, 'objectSummaries', 'obj-1'), {
        objectId: 'obj-1',
        asOf: new Date().toISOString()
      });
    });

    const db = getAuthenticatedContext(ownerId);
    const summaryRef = doc(db, 'objectSummaries', 'obj-1');
    await expect(getDoc(summaryRef)).resolves.not.toThrow();
  });

  // 8. legacy collection client write is denied
  test('legacy collection client write is denied', async () => {
    const db = getAuthenticatedContext(ownerId);
    const itemRef = doc(db, 'items', 'item-1');
    await expect(
      setDoc(itemRef, {
        id: 'item-1',
        ownerId: ownerId,
        name: 'Legacy Item'
      })
    ).rejects.toThrow();
  });

  // 9. invalid Timestamp or ID is denied
  test('invalid Timestamp or ID is denied', async () => {
    const db = getAuthenticatedContext(ownerId);
    
    // Invalid objectId format (non-alphanumeric chars not allowed in isValidId)
    const invalidIdRef = doc(db, 'objects', 'obj$$$invalid');
    await expect(
      setDoc(invalidIdRef, {
        objectId: 'obj$$$invalid',
        ownerId: ownerId,
        name: 'Invalid ID Object'
      })
    ).rejects.toThrow();

    // Invalid _meta timestamp (non-timestamp format, e.g. a string instead of ServerTimestamp/Date)
    const invalidTimeRef = doc(db, 'objects', 'obj-2');
    await expect(
      setDoc(invalidTimeRef, {
        objectId: 'obj-2',
        ownerId: ownerId,
        name: 'Invalid Time Object',
        _meta: {
          recordCreatedAt: 'not-a-timestamp',
          recordUpdatedAt: 'not-a-timestamp',
          recordCreatedBy: ownerId,
          recordUpdatedBy: ownerId,
          schemaVersion: 1
        }
      })
    ).rejects.toThrow();
  });

  // 10. unknown fields are denied
  test('unknown fields are denied', async () => {
    const db = getAuthenticatedContext(ownerId);
    const objRef = doc(db, 'objects', 'obj-1');
    await expect(
      setDoc(objRef, {
        objectId: 'obj-1',
        ownerId: ownerId,
        name: 'My Object',
        unknownField: 'bad-field-value',
        _meta: {
          recordCreatedAt: serverTimestamp(),
          recordUpdatedAt: serverTimestamp(),
          recordCreatedBy: ownerId,
          recordUpdatedBy: ownerId,
          schemaVersion: 1
        }
      })
    ).rejects.toThrow();
  });
});
