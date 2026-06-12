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
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
  buildMarkerWriteFromIdentifierInput,
  buildMarkerObservedWrite,
  buildObjectHasMarkerAssociationWrite,
  buildObjectLocationMeasurementWrite,
  buildEventWrite,
  buildObjectHasMarkerAssociationId,
  buildObjectHasMarkerDetachedAssociationWrite,
  buildObjectHasMarkerActiveTransitionAssociationWrite
} from '../../src/lib/entityFactProjectionWrites';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'scan-moukaeritai-work-builder-rules-test';
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

describe('Write Builder Contracts', () => {
  const ownerUid = 'owner-123';
  const nonOwnerUid = 'non-owner-456';

  describe('Part B: Marker contract tests', () => {
    it('owner can create builder-generated QR marker', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerWriteFromIdentifierInput({
        markerKey: 'qr-test',
        ownerId: ownerUid,
        kind: 'qr',
        scheme: 'url',
        canonicalValue: 'https://example.com',
        rawValue: 'https://example.com',
        createdAt: now,
        updatedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'markers', builderOutput.id), builderOutput.data));
    });

    it('owner can create builder-generated NFC marker', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerWriteFromIdentifierInput({
        markerKey: 'nfc-test',
        ownerId: ownerUid,
        kind: 'nfc',
        scheme: 'nfc-uid',
        canonicalValue: '04:12:34:56:78:9A:BC',
        rawValue: '04123456789abc',
        createdAt: now,
        updatedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'markers', builderOutput.id), builderOutput.data));
    });

    it('non-owner cannot read the marker', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerWriteFromIdentifierInput({
        markerKey: 'qr-private',
        ownerId: ownerUid,
        kind: 'qr',
        scheme: 'url',
        canonicalValue: 'https://private.com',
        createdAt: now,
        updatedAt: now,
      });

      // Seed it with rules disabled
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'markers', builderOutput.id), builderOutput.data);
      });

      const db = testEnv.authenticatedContext(nonOwnerUid).firestore();
      await assertFails(getDoc(doc(db, 'markers', builderOutput.id)));
    });

    it('unknown fields are still rejected', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerWriteFromIdentifierInput({
        markerKey: 'qr-reject',
        ownerId: ownerUid,
        kind: 'qr',
        scheme: 'url',
        canonicalValue: 'https://example.com',
        createdAt: now,
        updatedAt: now,
      });

      const dataWithUnknown = { ...builderOutput.data, someUnknownField: 'value' };
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'markers', builderOutput.id), dataWithUnknown));
    });
  });

  describe('Part C: Observation contract tests', () => {
    const markerKey = 'obs-marker';
    const objectId = 'obs-object';

    it('Succeeds with marker when actorUid is provided and marker is owned by user', async () => {
      // Seed marker
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-1',
        markerKey,
        actorUid: ownerUid,
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });

    it('Succeeds with objectId when object is also owned by user', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'objects', objectId), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-2',
        markerKey,
        objectId,
        actorUid: ownerUid,
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });

    it('Fails without actorUid (no userIds path exists for authorization)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-3',
        markerKey,
        // actorUid intentionally omitted
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });

    it('Fails when target marker does not exist', async () => {
      // Do NOT seed the marker
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-4',
        markerKey: 'non-existent-marker',
        actorUid: ownerUid,
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });

    it('Fails when marker exists but is owned by another user', async () => {
      // Seed marker owned by nonOwnerUid
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: nonOwnerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-5',
        markerKey,
        actorUid: ownerUid,
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });

    it('Fails when objectId is included but object is owned by another user', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        // Marker owned by user
        await setDoc(doc(adminDb, 'markers', markerKey), { ownerId: ownerUid });
        // Object owned by someone else
        await setDoc(doc(adminDb, 'objects', objectId), { ownerId: nonOwnerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildMarkerObservedWrite({
        observationId: 'obs-6',
        markerKey,
        objectId,
        actorUid: ownerUid,
        observedAt: now,
        receivedAt: now,
        source: 'qr',
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'observations', builderOutput.id), builderOutput.data));
    });
  });

  describe('Part D: Association contract tests', () => {
    const assocMarkerKey = 'assoc-marker';
    const assocObjectId = 'assoc-object';

    it('Succeeds with seeded object and marker', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-1',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        validFrom: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('Fails without target marker', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        // Intentional: missing marker
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-2',
        objectId: assocObjectId,
        markerKey: 'missing-marker',
        ownerId: ownerUid,
        actorUid: ownerUid,
        validFrom: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('owner can create detached object_has_marker Association Fact', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerDetachedAssociationWrite({
        associationId: 'assoc-det-1',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        detachedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('owner can create reattach active transition Association Fact', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerActiveTransitionAssociationWrite({
        associationId: 'assoc-act-1',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        attachedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('normal user cannot update an existing active Association Fact to detached', async () => {
      const activeAssocId = buildObjectHasMarkerAssociationId(assocObjectId, assocMarkerKey);

      // Seed target documents and initial active association fact using testEnv as admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });

        const now = serverTimestamp() as Timestamp;
        const builderOutput = buildObjectHasMarkerAssociationWrite({
          associationId: activeAssocId,
          objectId: assocObjectId,
          markerKey: assocMarkerKey,
          ownerId: ownerUid,
          actorUid: ownerUid,
          validFrom: now,
        });
        await setDoc(doc(adminDb, 'associations', builderOutput.id), builderOutput.data);
      });

      // Attempt to update the existing document status to detached as a normal user
      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', activeAssocId), { status: 'detached' }, { merge: true }));
    });

    it('detached Association Fact creation is rejected if the target marker is missing', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        // Intentional: missing marker
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerDetachedAssociationWrite({
        associationId: 'assoc-det-no-marker',
        objectId: assocObjectId,
        markerKey: 'missing-marker',
        ownerId: ownerUid,
        actorUid: ownerUid,
        detachedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('detached Association Fact creation is rejected if the target object is not owned by the actor', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: nonOwnerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerDetachedAssociationWrite({
        associationId: 'assoc-det-not-owner',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid, // Even if requested with ownerId, object lookup fails
        actorUid: ownerUid,
        detachedAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('Fails without target object', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        // Intentional: missing object
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-3',
        objectId: 'missing-object',
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        validFrom: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('Fails when marker is owned by another user', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: ownerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: nonOwnerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-4',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        validFrom: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });

    it('Fails when object is owned by another user', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', assocObjectId), { ownerId: nonOwnerUid });
        await setDoc(doc(adminDb, 'markers', assocMarkerKey), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectHasMarkerAssociationWrite({
        associationId: 'assoc-5',
        objectId: assocObjectId,
        markerKey: assocMarkerKey,
        ownerId: ownerUid,
        actorUid: ownerUid,
        validFrom: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'associations', builderOutput.id), builderOutput.data));
    });
  });

  describe('Part E: Measurement contract tests', () => {
    const measObjectId = 'meas-object';

    it('Succeeds with object and actorUid', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', measObjectId), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectLocationMeasurementWrite({
        measurementId: 'meas-1',
        objectId: measObjectId,
        actorUid: ownerUid,
        measuredAt: now,
        receivedAt: now,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'measurements', builderOutput.id), builderOutput.data));
    });

    it('buildObjectLocationMeasurementWrite requires actorUid for normal client authorization under current rules', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', measObjectId), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectLocationMeasurementWrite({
        measurementId: 'meas-2',
        objectId: measObjectId,
        // actorUid intentionally omitted
        measuredAt: now,
        receivedAt: now,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      // Without actorUid, userIds is empty, and legacy.ownerId is not populated by the builder.
      // So authorization fails.
      await assertFails(setDoc(doc(db, 'measurements', builderOutput.id), builderOutput.data));
    });

    it('Fails when object is owned by another user', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', measObjectId), { ownerId: nonOwnerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildObjectLocationMeasurementWrite({
        measurementId: 'meas-3',
        objectId: measObjectId,
        actorUid: ownerUid,
        measuredAt: now,
        receivedAt: now,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'measurements', builderOutput.id), builderOutput.data));
    });
  });

  describe('Part F: Event contract tests', () => {
    const eventObjectId = 'event-object';

    it('Succeeds for a user participant', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildEventWrite({
        eventId: 'evt-1',
        eventType: 'object_created',
        participants: [
          { role: 'user', ref: { entityType: 'user', id: ownerUid } }
        ],
        occurredAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'events', builderOutput.id), builderOutput.data));
    });

    it('Succeeds for object event when object is owned by ownerUid', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', eventObjectId), { ownerId: ownerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildEventWrite({
        eventId: 'evt-2',
        eventType: 'object_updated',
        participants: [
          { role: 'object', ref: { entityType: 'object', id: eventObjectId } },
          { role: 'user', ref: { entityType: 'user', id: ownerUid } }
        ],
        occurredAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertSucceeds(setDoc(doc(db, 'events', builderOutput.id), builderOutput.data));
    });

    it('Fails for object event when object is owned by nonOwnerUid', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'objects', eventObjectId), { ownerId: nonOwnerUid });
      });

      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildEventWrite({
        eventId: 'evt-3',
        eventType: 'object_updated',
        participants: [
          { role: 'object', ref: { entityType: 'object', id: eventObjectId } },
          { role: 'user', ref: { entityType: 'user', id: ownerUid } }
        ],
        occurredAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'events', builderOutput.id), builderOutput.data));
    });

    it('Fails when no userIds and no legacy.ownerId are present', async () => {
      const now = serverTimestamp() as Timestamp;
      const builderOutput = buildEventWrite({
        eventId: 'evt-4',
        eventType: 'system_event',
        participants: [
          { role: 'system', ref: { entityType: 'device', id: 'sys-device' } }
        ],
        occurredAt: now,
      });

      const db = testEnv.authenticatedContext(ownerUid).firestore();
      await assertFails(setDoc(doc(db, 'events', builderOutput.id), builderOutput.data));
    });
  });
});
