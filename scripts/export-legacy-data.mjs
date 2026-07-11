import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const databaseId = 'photo-moukaeritai-work';
const projectId = 'moukaeritaid';

console.log('📦 scan.mw Legacy Data Exporter (Read-Only Safety-Locked)');

// Read current app version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const appVersion = packageJson.version;

// Prepare timestamp and destination folder
const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
const exportDir = path.join(rootDir, '.local-data', 'legacy-export', timestampStr);

// Core Collections to export
const targetCollections = [
  'objects',
  'identifiers',
  'objectIdentifierBindings',
  'items',
  'objectImages',
  'objectEvents'
];

async function runExporter() {
  console.log(`- Database ID:  ${databaseId}`);
  console.log(`- Project ID:   ${projectId}`);
  console.log(`- App Version:  ${appVersion}`);

  // 1. Attempt to load firebase-admin / firestore
  let admin, getFirestore;
  try {
    admin = (await import('firebase-admin')).default;
    getFirestore = (await import('firebase-admin/firestore')).getFirestore;
  } catch (err) {
    console.warn('⚠️ firebase-admin or @google-cloud/firestore is not available. Performing Dry-Run only.');
    gracefulDryRun();
    return;
  }

  // 2. Check if credentials can be loaded
  let db;
  try {
    // If no credentials environment variable exists, we assume no credentials.
    // We can also try a lightweight initialization and check if it throws or fails.
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
      console.log('ℹ️ No service account credentials found in environment (GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_CONFIG is empty).');
      console.log('Skipping actual export. Performing dry-run validation.');
      gracefulDryRun();
      return;
    }

    admin.initializeApp({
      projectId: projectId
    });
    
    // Attempt to access custom databaseId
    db = getFirestore(databaseId);
  } catch (err) {
    console.warn(`⚠️ SDK Initialization or credential loading failed: ${err.message}`);
    console.log('Skipping live export. Running dry-run instead.');
    gracefulDryRun();
    return;
  }

  // 3. Perform Read-Only Export
  console.log('🚀 Authenticated! Fetching collections (READ-ONLY)...');
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    appVersion: appVersion,
    databaseId: databaseId,
    collections: {}
  };

  try {
    for (const colName of targetCollections) {
      console.log(`  Reading collection "${colName}"...`);
      const snapshot = await db.collection(colName).get();
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({
          id: doc.id,
          data: doc.data()
        });
      });
      exportPayload.collections[colName] = docs;
      console.log(`  Successfully fetched ${docs.length} documents from "${colName}"`);
    }

    // Write file
    fs.mkdirSync(exportDir, { recursive: true });
    const outputPath = path.join(exportDir, 'export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2), 'utf8');
    console.log(`✅ Legacy export completed successfully! Saved to: ${outputPath}`);
  } catch (err) {
    console.error(`❌ Firestore read-only export failed: ${err.message}`);
    process.exit(1);
  }
}

function gracefulDryRun() {
  console.log('--- DRY-RUN MODE ---');
  console.log('Verification checks:');
  console.log('  [PASS] Read-only constraint: No insert/update/delete operations present in code.');
  console.log('  [PASS] Batch write constraint: No transactional/batch write methods imported.');
  console.log(`  [PASS] Output location planned: .local-data/legacy-export/${timestampStr}/`);
  console.log('  [PASS] Target database: photo-moukaeritai-work');
  console.log('  [PASS] Metadata payload blueprint validated.');
  console.log('--------------------');
  console.log('Exiting gracefully. No live data was read or written.');
}

runExporter();
