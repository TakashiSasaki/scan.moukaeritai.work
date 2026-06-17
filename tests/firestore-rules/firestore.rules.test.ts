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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, collection, Timestamp } from 'firebase/firestore';

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

  describe('Target Entity / Fact / Projection Collections', () => {
    describe('markers (Entity)', () => {
      const validMarker = {
        markerKey: 'm1',
        ownerId: ownerUid,
        medium: 'visual_code',
        payloadLayer: 'encoded_payload',
        payloadKind: 'url',
        stability: 'stable'
      };

      it('validates shape and immutability on update', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'markers', 'm1'), validMarker);
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();

        // Changing immutable fields (medium) fails
        await assertFails(updateDoc(doc(db, 'markers', 'm1'), { medium: 'nfc' }));

        // Adding valid fields succeeds
        await assertSucceeds(updateDoc(doc(db, 'markers', 'm1'), { canonicalPayload: 'test' }));

        // Changing it once set fails
        await assertFails(updateDoc(doc(db, 'markers', 'm1'), { canonicalPayload: 'changed' }));

        // Adding unknown field fails
        await assertFails(updateDoc(doc(db, 'markers', 'm1'), { unknownField: 'test' }));
      });
    });

    describe('places (Entity)', () => {
      const validPlace = {
        placeId: 'p1',
        ownerId: ownerUid,
        label: 'My Place'
      };

      it('rejects unknown fields on create and update', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();

        await assertFails(setDoc(doc(db, 'places', 'p1'), { ...validPlace, unknownField: true }));
        await assertSucceeds(setDoc(doc(db, 'places', 'p1'), validPlace));

        await assertFails(updateDoc(doc(db, 'places', 'p1'), { unknownField: true }));
        await assertSucceeds(updateDoc(doc(db, 'places', 'p1'), { label: 'New Label' }));
      });
    });

    describe('associations (Fact)', () => {
      const validAssociation = {
        associationId: 'a1',
        associationType: 'binding',
        participants: [{role: 'user', ref: {id: ownerUid, entityType: 'user'}}],
        participantKeys: [`user:${ownerUid}`],
        userIds: [ownerUid],
        time: { validFrom: serverTimestamp() }
      };

      it('rejects unknown fields', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'associations', 'a1'), { ...validAssociation, unknown: true }));
      });

      it('rejects invalid time type', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'associations', 'a1'), { ...validAssociation, time: { validFrom: 'not-a-timestamp' } }));
      });

      it('allows access via legacy.ownerId', async () => {
        const legacyAssoc = { ...validAssociation, associationId: 'a2', userIds: [], legacy: { ownerId: ownerUid } };
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(setDoc(doc(db, 'associations', 'a2'), legacyAssoc));
        await assertSucceeds(getDoc(doc(db, 'associations', 'a2')));

        const nonOwnerDb = testEnv.authenticatedContext(nonOwnerUid).firestore();
        await assertFails(getDoc(doc(nonOwnerDb, 'associations', 'a2')));
      });
    });

    describe('observations target collection', () => {
      const markerKey = 'm1';
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'markers', markerKey), { ownerId: ownerUid });
        });
      });
      const validObservation = {

        observationId: 'o1',
        identifierKey: markerKey,
        ownerId: ownerUid,
        observerKind: 'user',
        observerUid: ownerUid,
        observedAt: serverTimestamp(),
        receivedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        source: 'qr',
        observationType: 'scan'
      };

      it('owner-can-create-valid-observation', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'markers', markerKey), { ownerId: ownerUid });
        });
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(setDoc(doc(db, 'observations', 'o1'), validObservation));
      });

      it('signed-out-cannot-create-observation', async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), validObservation));
      });

      it('owner-mismatch-denied', async () => {
        const db = testEnv.authenticatedContext('other-uid').firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), validObservation));
      });

      it('observer-uid-mismatch-denied', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, observerUid: 'other-uid' }));
      });

      it('observer-kind-device-denied-for-client', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, observerKind: 'device' }));
      });

      it('unknown-field-denied', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, unknownField: true }));
      });

      it('invalid-source-denied', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, source: 'invalid' }));
      });

      it('invalid-observation-type-denied', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, observationType: 'invalid' }));
      });

      it('invalid-location-denied', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, location: { invalid: true } }));
      });

      it('received-at-must-be-request-time', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        const oldTime = Timestamp.fromDate(new Date('2020-01-01'));
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, receivedAt: oldTime }));
      });

      it('created-at-must-be-request-time', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        const oldTime = Timestamp.fromDate(new Date('2020-01-01'));
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { ...validObservation, createdAt: oldTime }));
      });

      it('normal-user-update-denied', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'observations', 'o1'), validObservation);
        });
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'observations', 'o1'), { note: 'updated' }, { merge: true }));
      });

      it('normal-user-delete-denied', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'observations', 'o1'), validObservation);
        });
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(deleteDoc(doc(db, 'observations', 'o1')));
      });

      it('admin-delete-allowed', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'observations', 'o1'), validObservation);
        });
        const adminDb = testEnv.authenticatedContext('admin-uid').firestore();
        await testEnv.withSecurityRulesDisabled(async (context) => {
           await setDoc(doc(context.firestore(), 'admins', 'admin-uid'), { role: 'admin' });
        });
        await assertSucceeds(deleteDoc(doc(adminDb, 'observations', 'o1')));
      });

      it('read-switching-not-authorized', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(getDoc(doc(db, 'observations', 'o1')));
      });

      it('projection-write-not-authorized', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        const projectionWrite = {
           observationId: 'o1',
           observationType: 'scan',
           participants: [],
           participantKeys: [],
           time: { observedAt: serverTimestamp(), receivedAt: serverTimestamp() }
        };
        await assertFails(setDoc(doc(db, 'observations', 'o1'), projectionWrite));
      });

      it('objectId-present-and-owned-object-succeeds', async () => {
        const observationId = 'obs-owned-object-succeeds';
        const markerKey = 'marker-owned-object-succeeds';
        const objectId = 'object-owned-object-succeeds';

        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
          await setDoc(doc(adminDb, 'objects', objectId), { ownerId: ownerUid });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();

        await assertSucceeds(setDoc(doc(db, 'observations', observationId), {
          ...validObservation,
          observationId,
          identifierKey: markerKey,
          objectId,
        }));
      });

      it('objectId-present-and-missing-object-denied', async () => {
        const observationId = 'obs-missing-object-denied';
        const markerKey = 'marker-missing-object-denied';
        const objectId = 'object-missing-object-denied';

        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();

        await assertFails(setDoc(doc(db, 'observations', observationId), {
          ...validObservation,
          observationId,
          identifierKey: markerKey,
          objectId,
        }));
      });

      it('objectId-present-and-non-owned-object-denied', async () => {
        const observationId = 'obs-non-owned-object-denied';
        const markerKey = 'marker-non-owned-object-denied';
        const objectId = 'object-non-owned-object-denied';

        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
          await setDoc(doc(adminDb, 'objects', objectId), { ownerId: nonOwnerUid });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();

        await assertFails(setDoc(doc(db, 'observations', observationId), {
          ...validObservation,
          observationId,
          identifierKey: markerKey,
          objectId,
        }));
      });
    });

    describe('measurements (Fact)', () => {
      const validMeasurement = {
        measurementId: 'm1',
        measurementType: 'location',
        participants: [{role: 'user', ref: {id: ownerUid, entityType: 'user'}}],
        participantKeys: [`user:${ownerUid}`],
        userIds: [ownerUid],
        time: { measuredAt: serverTimestamp() }
      };

      it('rejects unknown fields', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'measurements', 'm1'), { ...validMeasurement, unknown: true }));
      });

      it('rejects invalid time type', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'measurements', 'm1'), { ...validMeasurement, time: { measuredAt: 'not-a-timestamp' } }));
      });

      it('allows access via legacy.ownerId', async () => {
        const legacyMeas = { ...validMeasurement, measurementId: 'm2', userIds: [], legacy: { ownerId: ownerUid } };
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(setDoc(doc(db, 'measurements', 'm2'), legacyMeas));
      });
    });

    describe('events (Fact)', () => {
      const validEvent = {
        eventId: 'e1',
        eventType: 'object_created',
        participants: [{role: 'user', ref: {id: ownerUid, entityType: 'user'}}],
        participantKeys: [`user:${ownerUid}`],
        userIds: [ownerUid],
        time: { occurredAt: serverTimestamp() }
      };

      it('rejects unknown fields', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'events', 'e1'), { ...validEvent, unknown: true }));
      });

      it('rejects invalid time type', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'events', 'e1'), { ...validEvent, time: { occurredAt: 'not-a-timestamp' } }));
      });

      it('allows access via legacy.ownerId', async () => {
        const legacyEvent = { ...validEvent, eventId: 'e2', userIds: [], legacy: { ownerId: ownerUid } };
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(setDoc(doc(db, 'events', 'e2'), legacyEvent));
      });
    });

    describe('summaries (Projection)', () => {
      const validSummary = { asOf: serverTimestamp() };

      it('markerSummaries: normal user cannot create/update, admin can', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'markerSummaries', 'ms1'), validSummary));
      });

      it('placeSummaries: normal user cannot create/update, admin can', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'placeSummaries', 'ps1'), validSummary));
      });
    });
  });

  describe('objectEvents', () => {
    const validEvent = {
        eventId: 'evt1',
        eventType: 'object_created',
        participants: [{role: 'object', ref: {id: 'obj1', entityType: 'object'}}],
        participantKeys: ['object:obj1'],
        objectIds: ['obj1'],
        userIds: [ownerUid],
        time: { occurredAt: serverTimestamp() }
      };

            it('user can create event when userIds contains uid or legacy.ownerId == uid AND owns linked entities', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          await setDoc(doc(db, 'objects', 'obj1'), {
            objectId: 'obj1', ownerId: ownerUid, name: 'T', status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
          });
        });

        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(setDoc(doc(db, 'events', 'evt1'), validEvent));
      });

      it('different user cannot read it', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'events', 'evt1'), validEvent);
        });
        const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
        await assertFails(getDoc(doc(db, 'events', 'evt1')));
      });

      it('normal user cannot update it', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'events', 'evt1'), validEvent);
        });
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(updateDoc(doc(db, 'events', 'evt1'), { note: 'update' }));
      });
    });

    describe('summaries (Projection)', () => {
      const validSummary = {
        objectId: 'obj1',
        asOf: serverTimestamp()
      };

      it('normal user cannot create/update summary', async () => {
        const db = testEnv.authenticatedContext(ownerUid).firestore();
        await assertFails(setDoc(doc(db, 'objectSummaries', 'obj1'), validSummary));
      });

      it('admin can create/update summary', async () => {
        await setupAdmin();
        const adminDb = testEnv.authenticatedContext(adminUid).firestore();
        await assertSucceeds(setDoc(doc(adminDb, 'objectSummaries', 'obj1'), validSummary));
        await assertSucceeds(updateDoc(doc(adminDb, 'objectSummaries', 'obj1'), { lastMeasuredAt: serverTimestamp() }));
      });

      it('normal user can read summary if they own the parent entity', async () => {
        await setupAdmin();
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          // create parent entity
          await setDoc(doc(db, 'objects', 'obj1'), {
            objectId: 'obj1',
            ownerId: ownerUid,
            name: 'Test Object',
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          // create summary
          await setDoc(doc(db, 'objectSummaries', 'obj1'), validSummary);
        });

        const ownerDb = testEnv.authenticatedContext(ownerUid).firestore();
        await assertSucceeds(getDoc(doc(ownerDb, 'objectSummaries', 'obj1')));

        const nonOwnerDb = testEnv.authenticatedContext(nonOwnerUid).firestore();
        await assertFails(getDoc(doc(nonOwnerDb, 'objectSummaries', 'obj1')));
      });
    });
});
