import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const appletConfig = JSON.parse(fs.readFileSync('../firebase-applet-config.json', 'utf8'));

// Initialize Firebase Admin (Assumes GOOGLE_APPLICATION_CREDENTIALS is set)
const app = getApps().length ? getApps()[0] : initializeApp();

const db = getFirestore(app, appletConfig.firestoreDatabaseId);

// Safety overrides to strictly prevent accidental writes
db.collection = new Proxy(db.collection, {
  apply: function (target, thisArg, argumentsList) {
    const col = Reflect.apply(target, thisArg, argumentsList);
    col.add = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };
    return col;
  }
});

const DocumentReference = require('@google-cloud/firestore').DocumentReference;
DocumentReference.prototype.set = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };
DocumentReference.prototype.update = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };
DocumentReference.prototype.delete = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };
DocumentReference.prototype.create = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };

const WriteBatch = require('@google-cloud/firestore').WriteBatch;
WriteBatch.prototype.commit = () => { throw new Error('Write operations are strictly prohibited in this read-only script.'); };


/**
 * @param {string} legacyItemId
 */
async function auditLegacyItem(legacyItemId) {
  console.log(`\n======================================================`);
  console.log(`Auditing legacy item: ${legacyItemId}`);
  console.log(`======================================================\n`);

  const itemRef = db.collection('items').doc(legacyItemId);
  const itemDoc = await itemRef.get();

  if (!itemDoc.exists) {
    console.error(`❌ Legacy item ${legacyItemId} not found.`);
    return;
  }

  const legacyData = itemDoc.data();
  console.log(`✅ Found legacy item document.`);

  // Object ID normalization check
  const objectId = legacyItemId.toUpperCase();
  console.log(`Expected normalized Object ID: ${objectId}`);

  // Fetch normalized object
  const objectDoc = await db.collection('objects').doc(objectId).get();
  if (!objectDoc.exists) {
    console.warn(`⚠️ Normalized object ${objectId} not found.`);
  } else {
    console.log(`✅ Normalized object found.`);
    const objData = objectDoc.data() || {};

    // Check object.legacy.legacyItemId
    if (objData.legacy?.legacyItemId === legacyItemId) {
      console.log(`  - Legacy reference preserved: ${objData.legacy.legacyItemId}`);
    } else {
      console.warn(`  - ⚠️ Legacy reference missing or mismatched!`);
    }

    // Image checks
    if (objData.primaryImageUrl) console.log(`  - primaryImageUrl populated.`);
    if (objData.primaryImageId) console.log(`  - primaryImageId populated.`);

    // Ownership
    if (objData.ownerId) {
       console.log(`  - ownerId populated.`);
    } else {
       console.warn(`  - ⚠️ ownerId missing!`);
    }
  }

  // Check bindings
  const bindingsSnapshot = await db.collection('objectIdentifierBindings')
    .where('objectId', '==', objectId)
    .get();

  console.log(`\nFound ${bindingsSnapshot.size} binding(s) for object.`);
  for (const bDoc of bindingsSnapshot.docs) {
    console.log(`  - Binding: ${bDoc.id} (status: ${bDoc.data().status})`);
  }

  // Check images
  const imagesSnapshot = await db.collection('objectImages')
    .where('objectId', '==', objectId)
    .get();
  console.log(`\nFound ${imagesSnapshot.size} image(s) for object.`);

  // Check events
  const eventsSnapshot = await db.collection('objectEvents')
    .where('objectId', '==', objectId)
    .get();
  console.log(`\nFound ${eventsSnapshot.size} event(s) for object.`);

  // Legacy field checks
  console.log(`\n--- Legacy Specific Fields ---`);
  if (legacyData?.bluetoothTags) {
     console.log(`🔹 bluetoothTags field exists in legacy item (Count: ${legacyData.bluetoothTags.length}). [Intentionally keeping raw values hidden]`);
  } else {
     console.log(`🔹 No bluetoothTags field in legacy item.`);
  }

  if (legacyData?.tagType) {
    console.log(`🔹 tagType: ${legacyData.tagType}`);
  }

  console.log(`\nFinished audit for ${legacyItemId}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: cd functions && node scripts/audit-legacy-items.mjs <legacyItemId1> [legacyItemId2] ...");
    console.error("This script is read-only and requires explicit legacy item IDs.");
    process.exit(1);
  }

  console.log("Starting Read-Only Legacy Item Audit...");

  for (const legacyItemId of args) {
    await auditLegacyItem(legacyItemId);
  }
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
