import util from 'node:util';

const args = process.argv.slice(2);

let targetType;
let targetId;
let dryRun = true;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--target-type') {
    targetType = args[++i];
  } else if (arg === '--target-id') {
    targetId = args[++i];
  } else if (arg === '--dry-run') {
    const val = args[++i];
    if (val === 'true') dryRun = true;
    else if (val === 'false') dryRun = false;
    else {
      console.error(`❌ Invalid --dry-run value: "${val}". Must be "true" or "false".`);
      process.exit(1);
    }
  }
}

if (!targetType || !['object', 'marker', 'place'].includes(targetType)) {
  console.error(`❌ Missing or invalid --target-type. Must be "object", "marker", or "place".`);
  process.exit(1);
}

if (!targetId || targetId.trim() === '') {
  console.error(`❌ Missing or empty --target-id.`);
  process.exit(1);
}

if (targetId.includes('/')) {
  console.error(`❌ Invalid --target-id: "${targetId}". Must not contain '/'.`);
  process.exit(1);
}

const payload = {
  data: {
    targetType,
    targetId: targetId.trim(),
    dryRun
  }
};

console.log('====================================================');
console.log('✅ Payload Validation Successful');
console.log('====================================================');
console.log('Target Type :', targetType);
console.log('Target ID   :', targetId);
console.log('Dry Run     :', dryRun);
console.log('\nCallable Name: recomputeProjectionSummary');
console.log('\nJSON Payload to send:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n====================================================');
console.log('Instructions for Manual Invocation:');
console.log('1. Ensure you have the appropriate admin credentials or token.');
console.log('2. Send an authenticated POST request to the deployed Callable endpoint.');
console.log('   Example using curl (replace variables appropriately):');
console.log('');
console.log(`   curl -X POST https://<REGION>-<PROJECT_ID>.cloudfunctions.net/recomputeProjectionSummary \\`);
console.log(`        -H "Content-Type: application/json" \\`);
console.log(`        -H "Authorization: Bearer <YOUR_AUTH_TOKEN>" \\`);
console.log(`        -d '${JSON.stringify(payload)}'`);
console.log('');
console.log('⚠️ Safety Note: Start with dryRun=true and a known test target.');
console.log('Do not execute broad backfills or UI read switching based on this single validation.');
console.log('====================================================');
