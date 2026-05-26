import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'moukaeritaid',
  });
}

const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore(admin.app(), "photo-moukaeritai-work");

async function runFieldAudit() {
  console.log("Starting Phase 7D.1 Legacy Items Field Audit...");

  const ownerId = process.env.OWNER_ID;
  const limitStr = process.env.LIMIT || "50";
  const limit = parseInt(limitStr, 10);
  const includeSamples = process.env.INCLUDE_SAMPLES === 'true';

  console.log(`Config: ownerId=${ownerId || 'ALL'}, limit=${limit}, includeSamples=${includeSamples}`);

  let query: admin.firestore.Query = db.collection('items');
  if (ownerId) {
    query = query.where('ownerId', '==', ownerId);
  }
  query = query.limit(limit);

  const snapshot = await query.get();
  console.log(`Fetched ${snapshot.size} documents.`);

  const pathStats: Record<string, { count: number, types: Set<string>, sampleDocs: Set<string> }> = {};

  const processObject = (obj: any, prefix = '', docId: string) => {
    if (obj === null) {
      recordPath(prefix, 'null', docId);
      return;
    }

    if (Array.isArray(obj)) {
      recordPath(prefix, 'array', docId);
      if (obj.length > 0) {
        // Sample first element to check inner types
        processObject(obj[0], `${prefix}[]`, docId);
      }
      return;
    }

    if (typeof obj === 'object') {
      if (obj instanceof admin.firestore.Timestamp || (obj._seconds !== undefined && obj._nanoseconds !== undefined)) {
        recordPath(prefix, 'timestamp', docId);
        return;
      }

      const keys = Object.keys(obj);
      if (prefix !== '') recordPath(prefix, 'object', docId); // Record the object itself

      for (const key of keys) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        processObject(obj[key], newPrefix, docId);
      }
      return;
    }

    recordPath(prefix, typeof obj, docId);
  };

  const recordPath = (path: string, type: string, docId: string) => {
    if (!pathStats[path]) {
      pathStats[path] = { count: 0, types: new Set(), sampleDocs: new Set() };
    }
    pathStats[path].count++;
    pathStats[path].types.add(type);
    if (pathStats[path].sampleDocs.size < 3) {
      pathStats[path].sampleDocs.add(docId);
    }
  };

  for (const doc of snapshot.docs) {
    const data = doc.data();
    processObject(data, '', doc.id);
  }

  // Format output
  const report: Record<string, any> = {};
  for (const [path, stats] of Object.entries(pathStats)) {
    if (path === '') continue; // Skip the root object itself
    report[path] = {
      count: stats.count,
      types: Array.from(stats.types),
      samples: includeSamples ? Array.from(stats.sampleDocs) : undefined
    };
  }

  console.log("\n--- Audit Summary ---");
  console.log(JSON.stringify({
    totalScanned: snapshot.size,
    fields: report
  }, null, 2));
  console.log("--- End of Audit ---");
}

runFieldAudit().then(() => {
  console.log("Done.");
  process.exit(0);
}).catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
