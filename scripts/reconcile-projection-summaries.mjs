import fs from 'node:fs';

const args = process.argv.slice(2);

let targetType;
let targetId;
let manifestPath;
let includeSummaries = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--target-type') {
    targetType = args[++i];
  } else if (arg === '--target-id') {
    targetId = args[++i];
  } else if (arg === '--manifest') {
    manifestPath = args[++i];
  } else if (arg === '--include-summaries') {
    includeSummaries = true;
  } else {
    console.error(`❌ Unknown flag: "${arg}".`);
    process.exit(1);
  }
}

if (manifestPath && (targetType || targetId)) {
  console.error(`❌ Cannot combine --manifest with --target-type or --target-id.`);
  process.exit(1);
}

if (manifestPath && includeSummaries) {
  console.error(`❌ Cannot combine --manifest with --include-summaries. The manifest file should specify includeSummaries.`);
  process.exit(1);
}

if (!manifestPath && (!targetType || !targetId)) {
  console.error(`❌ Must provide either --manifest OR both --target-type and --target-id.`);
  process.exit(1);
}

let payload;

if (manifestPath) {
  let manifestContent;
  try {
    manifestContent = fs.readFileSync(manifestPath, 'utf8');
  } catch (error) {
    console.error(`❌ Could not read manifest file at "${manifestPath}":`, error.message);
    process.exit(1);
  }

  let manifestData;
  try {
    manifestData = JSON.parse(manifestContent);
  } catch (error) {
    console.error(`❌ Invalid JSON in manifest file:`, error.message);
    process.exit(1);
  }

  payload = { data: manifestData };
} else {
  if (!['object', 'marker', 'place'].includes(targetType)) {
    console.error(`❌ Invalid --target-type. Must be "object", "marker", or "place".`);
    process.exit(1);
  }

  if (targetId.trim() === '') {
    console.error(`❌ Missing or empty --target-id.`);
    process.exit(1);
  }

  if (targetId.includes('/')) {
    console.error(`❌ Invalid --target-id: "${targetId}". Must not contain '/'.`);
    process.exit(1);
  }

  payload = {
    data: {
      includeSummaries,
      targets: [
        {
          targetType,
          targetId: targetId.trim()
        }
      ]
    }
  };
}

const finalTargets = payload.data?.targets;
const finalIncludeSummaries = payload.data?.includeSummaries ?? false;

if (!Array.isArray(finalTargets) || finalTargets.length === 0) {
  console.error(`❌ Payload must contain a non-empty "targets" array.`);
  process.exit(1);
}

const maxCount = finalIncludeSummaries ? 5 : 20;
if (finalTargets.length > maxCount) {
  console.error(`❌ Too many targets. Maximum allowed is ${maxCount} when includeSummaries=${finalIncludeSummaries}. Got ${finalTargets.length}.`);
  process.exit(1);
}

console.log('====================================================');
console.log('✅ Payload Validation Successful');
console.log('====================================================');
console.log('Callable Name    : reconcileProjectionSummaries');
console.log('Target Count     :', finalTargets.length);
console.log('Include Summaries:', finalIncludeSummaries);
console.log('\nJSON Payload to send:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n====================================================');
console.log('Instructions for Manual Invocation:');
console.log('1. Ensure you have the appropriate admin credentials or token.');
console.log('2. Send an authenticated POST request to the deployed Callable endpoint.');
console.log('   Example using curl (replace variables appropriately):');
console.log('');
console.log(`   curl -X POST https://<REGION>-<PROJECT_ID>.cloudfunctions.net/reconcileProjectionSummaries \\`);
console.log(`        -H "Content-Type: application/json" \\`);
console.log(`        -H "Authorization: Bearer <YOUR_AUTH_TOKEN>" \\`);
console.log(`        -d '${JSON.stringify(payload)}'`);
console.log('');
console.log('⚠️ Safety Note: This is read-only selected-target reconciliation.');
console.log('It does not perform broad backfill and does not authorize UI read switching.');
console.log('====================================================');
