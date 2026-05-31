import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'scan-moukaeritai-work-rules-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = join(__dirname, '../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Rules Baseline', () => {
  const ownerUid = 'owner-123';
  const nonOwnerUid = 'non-owner-456';
  const adminUid = 'admin-789';

  async function setupAdmin() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'admins', adminUid), { grantedAt: serverTimestamp() });
    });
  }

  describe('Global Safety Net', () => {
    it('default deny for unknown collections', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(getDoc(doc(db, 'unknownCollection', 'docId')));
    });

    it('signed-out users cannot read/write protected collections', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'objects', 'obj1')));
      await assertFails(setDoc(doc(unauthDb, 'objects', 'obj1'), {}));
    });

    it('explicitly denies operations on future/blocked collections', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      const blockedCollections = [
        'globalIdentifiers',
        'identifierClaims',
        'migrationRuns'
      ];

      for (const collectionName of blockedCollections) {
        const docRef = doc(db, collectionName, 'some-doc-id');

        await assertFails(getDoc(docRef));
        await assertFails(setDoc(docRef, { someField: true, ownerId: ownerUid, createdAt: serverTimestamp() }));
        await assertFails(updateDoc(docRef, { someField: true }));
        await assertFails(deleteDoc(docRef));
      }
    });

    it('explicitly denies operations on completely unknown collections', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const docRef = doc(db, 'unknownCollectionXyz123', 'doc1');

      await assertFails(getDoc(docRef));
      await assertFails(setDoc(docRef, { field: true }));
      await assertFails(updateDoc(docRef, { field: true }));
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('objects', () => {
    const validObjectData = {
      objectId: 'obj1',
      ownerId: ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    it('owner can create and read their own objects', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'objects', 'obj1'), validObjectData));
      await assertSucceeds(getDoc(doc(db, 'objects', 'obj1')));
    });

    it('owner can update and delete their own objects', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await setDoc(doc(db, 'objects', 'obj1'), validObjectData);

      await assertSucceeds(updateDoc(doc(db, 'objects', 'obj1'), {
        updatedAt: serverTimestamp()
      }));

      await assertSucceeds(deleteDoc(doc(db, 'objects', 'obj1')));
    });

    it('non-owner cannot read or modify another users objects', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'objects', 'obj1'), validObjectData);
      });

      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
      await assertFails(getDoc(doc(db, 'objects', 'obj1')));
      await assertFails(updateDoc(doc(db, 'objects', 'obj1'), {
        updatedAt: serverTimestamp()
      }));
      await assertFails(deleteDoc(doc(db, 'objects', 'obj1')));
    });
  });

  describe('identifiers', () => {
    const validIdentifier = {
      identifierKey: 'ident1',
      ownerId: ownerUid,
      kind: 'qr',
      scheme: 'https',
      canonicalValue: 'https://example.com/qr',
      status: 'unassigned', // needed for not having an objectId
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    it('owner can create/update identifiers with currently allowed fields', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier));

      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), {
        status: 'retired',
        updatedAt: serverTimestamp()
      }));
    });

    it('client writes to identifiers with additive v2 fields as map/versions are accepted on create and update', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      const validV2Identifier = {
        ...validIdentifier,
        rawPayload: { some: 'json' }, // now allowed
        identityModelVersion: 2, // now allowed
        identitySchemaVersion: 1, // now allowed
        canonicalizationVersion: 1, // now allowed
      };
      await assertSucceeds(setDoc(doc(db, 'identifiers', 'ident2'), { ...validV2Identifier, identifierKey: 'ident2' }));
      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), { rawPayload: { some: 'json' }, updatedAt: serverTimestamp() }));
    });

    it('client writes to identifiers with invalid rawPayload types are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { ...validIdentifier, identifierKey: 'ident-rawpayload-fail' });

      // Reject non-map types for rawPayload
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { rawPayload: 'string', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { rawPayload: 123, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { rawPayload: true, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { rawPayload: ['array'], updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-rawpayload-fail'), { rawPayload: null, updatedAt: serverTimestamp() }));

      // Also reject on create
      await assertFails(setDoc(doc(db, 'identifiers', 'ident3'), { ...validIdentifier, identifierKey: 'ident3', rawPayload: 'string' }));
      await assertFails(setDoc(doc(db, 'identifiers', 'ident4'), { ...validIdentifier, identifierKey: 'ident4', rawPayload: null }));
    });




    it('client writes to identifiers with valid identityModelVersion are accepted', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: 1, updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: 2, updatedAt: serverTimestamp() }));
    });

    it('client writes to identifiers with invalid identityModelVersion are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: '1', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: 0, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: 3, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: -1, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identityModelVersion: 1.5, updatedAt: serverTimestamp() }));

      // Reject on create
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-imv'), { ...validIdentifier, identifierKey: 'ident-imv', identityModelVersion: 3 }));
    });

    it('client writes to identifiers with valid identitySchemaVersion are accepted', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: 1, updatedAt: serverTimestamp() }));
    });

    it('client writes to identifiers with invalid identitySchemaVersion are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: '1', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: 0, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: 2, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: -1, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { identitySchemaVersion: 1.5, updatedAt: serverTimestamp() }));

      // Reject on create
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-isv'), { ...validIdentifier, identifierKey: 'ident-isv', identitySchemaVersion: 2 }));
    });

    it('client writes to identifiers with valid canonicalizationVersion are accepted', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: 1, updatedAt: serverTimestamp() }));
    });

    it('client writes to identifiers with invalid canonicalizationVersion are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident1'), validIdentifier);

      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: '1', updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: 0, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: 2, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: -1, updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident1'), { canonicalizationVersion: 1.5, updatedAt: serverTimestamp() }));

      // Reject on create
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-cv'), { ...validIdentifier, identifierKey: 'ident-cv', canonicalizationVersion: 2 }));
    });

    it('client writes to identifiers with forbidden fields are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      await setDoc(doc(db, 'identifiers', 'ident-forbidden-test'), { ...validIdentifier, identifierKey: 'ident-forbidden-test' });

      const forbiddenFields = [
        { identifierClaims: ['claim1'] },
        { globalIdentifierKey: 'global1' },
        { globalIdentifierId: 'global1' },
        { visibility: 'public' },
        { communityId: 'comm1' },
        { accessModelVersion: 1 },
        { readers: [ownerUid] },
        { writers: [ownerUid] },
        { editors: [ownerUid] },
        { allowedUserIds: [ownerUid] },
        { migrationRunId: 'run1' },
        { migrationStatus: 'migrated' },
        { importedObservationId: 'obs1' },
        { syntheticObservationId: 'obs2' },
      ];

      for (const forbidden of forbiddenFields) {
        // Test update rejection
        await assertFails(updateDoc(doc(db, 'identifiers', 'ident-forbidden-test'), { ...forbidden, updatedAt: serverTimestamp() }));

        // Test create rejection
        const key = 'ident-fbdn-' + Object.keys(forbidden)[0];
        await assertFails(setDoc(doc(db, 'identifiers', key), { ...validIdentifier, identifierKey: key, ...forbidden }));
      }
    });

    it('client writes violating owner and identity invariants are rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      // Setup a valid document to test updates against
      await setDoc(doc(db, 'identifiers', 'ident-invariants-test'), { ...validIdentifier, identifierKey: 'ident-invariants-test' });

      // --- CREATE INVARIANTS ---

      // Missing ownerId
      const { ownerId, ...missingOwner } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-owner'), { ...missingOwner, identifierKey: 'ident-no-owner' }));

      // ownerId: null
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-null-owner'), { ...validIdentifier, identifierKey: 'ident-null-owner', ownerId: null }));

      // ownerId not equal to request.auth.uid
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-wrong-owner'), { ...validIdentifier, identifierKey: 'ident-wrong-owner', ownerId: nonOwnerUid }));

      // Missing identifierKey
      const { identifierKey, ...missingKey } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-key'), missingKey));

      // identifierKey not equal to document ID
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-mismatch-key'), { ...validIdentifier, identifierKey: 'some-other-key' }));

      // Missing required fields (kind, scheme, canonicalValue, status)
      const { kind, ...missingKind } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-kind'), { ...missingKind, identifierKey: 'ident-no-kind' }));
      const { scheme, ...missingScheme } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-scheme'), { ...missingScheme, identifierKey: 'ident-no-scheme' }));
      const { canonicalValue, ...missingCanonical } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-canonical'), { ...missingCanonical, identifierKey: 'ident-no-canonical' }));
      const { status, ...missingStatus } = validIdentifier;
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-no-status'), { ...missingStatus, identifierKey: 'ident-no-status' }));

      // Unsupported kind
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-bad-kind'), { ...validIdentifier, identifierKey: 'ident-bad-kind', kind: 'magic' }));

      // Invalid status
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-bad-status'), { ...validIdentifier, identifierKey: 'ident-bad-status', status: 'deleted' }));

      // status: active without valid objectId
      await assertFails(setDoc(doc(db, 'identifiers', 'ident-active-no-obj'), { ...validIdentifier, identifierKey: 'ident-active-no-obj', status: 'active' }));

      // --- UPDATE INVARIANTS ---

      // Changing identifierKey
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { identifierKey: 'new-key', updatedAt: serverTimestamp() }));

      // Changing ownerId
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { ownerId: nonOwnerUid, updatedAt: serverTimestamp() }));

      // Changing kind
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { kind: 'nfc', updatedAt: serverTimestamp() }));

      // Changing scheme
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { scheme: 'new-scheme', updatedAt: serverTimestamp() }));

      // Changing canonicalValue
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { canonicalValue: 'new-val', updatedAt: serverTimestamp() }));

      // Changing createdAt
      await assertFails(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));

      // Adding objectId with status: active is accepted
      await assertSucceeds(updateDoc(doc(db, 'identifiers', 'ident-invariants-test'), { objectId: 'obj1', status: 'active', updatedAt: serverTimestamp() }));
    });
  });

  describe('identifierObservations', () => {
    const validObservation = {
      observationId: 'obs1',
      identifierKey: 'ident1',
      ownerId: ownerUid,
      observerKind: 'user',
      observerUid: ownerUid,
      observedAt: serverTimestamp(),
      receivedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      source: 'qr',
      observationType: 'sighting',
    };

    it('client can create ordinary identifierObservations (sighting/scan)', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'identifierObservations', 'obs1'), validObservation));

      const scanObs = { ...validObservation, observationId: 'obs2', observationType: 'scan' };
      await assertSucceeds(setDoc(doc(db, 'identifierObservations', 'obs2'), scanObs));
    });

    it('client cannot update identifierObservations', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await setDoc(doc(db, 'identifierObservations', 'obs1'), validObservation);

      await assertFails(updateDoc(doc(db, 'identifierObservations', 'obs1'), {
        note: 'updated'
      }));
    });

    it('client cannot create imported/synthetic observations', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const importedObs = { ...validObservation, observationId: 'obs3', observationType: 'imported' }; // Not 'sighting' or 'scan'
      await assertFails(setDoc(doc(db, 'identifierObservations', 'obs3'), importedObs));
    });

    it('admin can read/delete identifierObservations but cannot update them', async () => {
      await setupAdmin();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'identifierObservations', 'obs1'), validObservation);
      });

      const adminDb = testEnv.authenticatedContext(adminUid).firestore();

      await assertSucceeds(getDoc(doc(adminDb, 'identifierObservations', 'obs1')));

      // Still cannot update
      await assertFails(updateDoc(doc(adminDb, 'identifierObservations', 'obs1'), {
        note: 'admin update'
      }));

      await assertSucceeds(deleteDoc(doc(adminDb, 'identifierObservations', 'obs1')));
    });
  });

  describe('objectEvents', () => {
    const validEvent = {
      eventId: 'evt1',
      ownerId: ownerUid,
      actorUid: ownerUid,
      occurredAt: serverTimestamp(),
      type: 'scanned',
    };

    it('admin can update/delete objectEvents according to current rules', async () => {
      await setupAdmin();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'objectEvents', 'evt1'), validEvent);
      });

      const adminDb = testEnv.authenticatedContext(adminUid).firestore();

      await assertSucceeds(updateDoc(doc(adminDb, 'objectEvents', 'evt1'), {
        metadata: { adminNote: 'updated' }
      }));

      await assertSucceeds(deleteDoc(doc(adminDb, 'objectEvents', 'evt1')));
    });
  });

  describe('users', () => {
    it('signed-in user can get a known user document but cannot list users', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users', nonOwnerUid), {
          uid: nonOwnerUid,
          role: 'user'
        });
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(getDoc(doc(db, 'users', nonOwnerUid)));

      // List/queries are blocked for users other than self
      await assertFails(getDocs(collection(db, 'users')));
    });
  });

  describe('admins', () => {
    const validAdminData = { grantedAt: serverTimestamp(), grantedBy: adminUid };

    it('user can read their own admin document if it exists', async () => {
      await setupAdmin();
      const db = testEnv.authenticatedContext(adminUid).firestore();
      await assertSucceeds(getDoc(doc(db, 'admins', adminUid)));
    });

    it('non-admin cannot write admin documents', async () => {
      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
      await assertFails(setDoc(doc(db, 'admins', nonOwnerUid), validAdminData));
    });

    it('admin can write valid admin documents', async () => {
      await setupAdmin();
      const adminDb = testEnv.authenticatedContext(adminUid).firestore();
      await assertSucceeds(setDoc(doc(adminDb, 'admins', 'new-admin-uid'), validAdminData));
    });

    it('invalid admin document shape is rejected', async () => {
      await setupAdmin();
      const adminDb = testEnv.authenticatedContext(adminUid).firestore();
      // Test requires specific format
      await assertFails(setDoc(doc(adminDb, 'admins', 'new-admin-uid'), { someOtherField: true }));
    });
  });

  describe('objectImages', () => {
    const validImageData = {
      imageId: 'img1',
      ownerId: ownerUid,
      objectId: 'obj1',
      role: 'primary',
      storagePath: 'images/obj1/img1.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024,
      width: 800,
      height: 600,
      createdAt: serverTimestamp(),
      createdBy: ownerUid,
    };

    it('owner can create/read/update/delete their own object image', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();

      // Create
      await assertSucceeds(setDoc(doc(db, 'objectImages', 'img1'), validImageData));

      // Read
      await assertSucceeds(getDoc(doc(db, 'objectImages', 'img1')));

      // Update
      await assertSucceeds(updateDoc(doc(db, 'objectImages', 'img1'), {
        role: 'detail'
      }));

      // Delete
      await assertSucceeds(deleteDoc(doc(db, 'objectImages', 'img1')));
    });

    it('non-owner cannot read/update/delete another owner’s object image', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'objectImages', 'img1'), validImageData);
      });

      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();

      // Read
      await assertFails(getDoc(doc(db, 'objectImages', 'img1')));

      // Update
      await assertFails(updateDoc(doc(db, 'objectImages', 'img1'), {
        role: 'detail'
      }));

      // Delete
      await assertFails(deleteDoc(doc(db, 'objectImages', 'img1')));
    });

    it('invalid image payload is rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const invalidImageData = { ...validImageData, role: 'invalid-role' };

      await assertFails(setDoc(doc(db, 'objectImages', 'img2'), invalidImageData));
    });
  });

  describe('items (legacy collection)', () => {
    const validItemData = {
      id: 'item1',
      ownerId: ownerUid,
      name: 'Legacy Item',
      description: 'A test legacy item',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      tagType: 'qr'
    };

    it('owner can access their own legacy item', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'items', 'item1'), validItemData));
      await assertSucceeds(getDoc(doc(db, 'items', 'item1')));
    });

    it('non-owner cannot access another owner’s legacy item', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'items', 'item1'), validItemData);
      });

      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
      await assertFails(getDoc(doc(db, 'items', 'item1')));
    });

    it('admin access behaves according to current rules', async () => {
      await setupAdmin();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'items', 'item1'), validItemData);
      });

      const adminDb = testEnv.authenticatedContext(adminUid).firestore();
      // Admins can get items
      await assertSucceeds(getDoc(doc(adminDb, 'items', 'item1')));
    });

    it('invalid item payload is rejected', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      const invalidItemData = { ...validItemData, tagType: 'invalid-tag-type' };

      await assertFails(setDoc(doc(db, 'items', 'item2'), invalidItemData));
    });
  });

  describe('objectIdentifierBindings', () => {
    const validBinding = {
      bindingId: 'bind1',
      ownerId: ownerUid,
      objectId: 'obj1',
      identifierKey: 'ident1',
      status: 'active',
      attachedAt: serverTimestamp(),
      attachedBy: ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    it('owner can create binding', async () => {
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'objectIdentifierBindings', 'bind1'), validBinding));
    });

    it('non-owner cannot read or create binding', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'objectIdentifierBindings', 'bind1'), validBinding);
      });

      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
      await assertFails(getDoc(doc(db, 'objectIdentifierBindings', 'bind1')));

      // attempting to create a binding for another user
      const evilBinding = { ...validBinding, ownerId: ownerUid };
      await assertFails(setDoc(doc(db, 'objectIdentifierBindings', 'bind2'), evilBinding));
    });
  });
});
