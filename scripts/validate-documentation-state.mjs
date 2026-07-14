import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('🔍 Running Documentation Reality Gate...');

function fail(msg) {
  console.error(`❌ Documentation Reality Gate Failed: ${msg}`);
  process.exit(1);
}

function readText(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) fail(`${relativePath} not found.`);
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    fail(`Failed to read ${relativePath}: ${error.message}`);
  }
}

const docs = [
  ['README.md', readText('README.md')],
  ['AGENTS.md', readText('AGENTS.md')]
];

const allText = docs.map(([, text]) => text).join('\n');

for (const [fileName, text] of docs) {
  if (!text.trim()) fail(`${fileName} is empty.`);

  if (!/legacy[\s\S]{0,80}(read-only|archive)/i.test(text)) {
    fail(`${fileName} must describe legacy collections as read-only/archive data.`);
  }

  if (!/(vertical slice|Object\/Marker\/Association|Object.*Marker.*Association)/i.test(text)) {
    fail(`${fileName} must identify the EFP-native Object/Marker/Association vertical slice as the current priority.`);
  }

  const activeMigrationPatterns = [
    /legacy\s+(migration|dual-write|backfill|reconciliation|runtime integration)\s+is\s+(active|current|planned|in progress|required)/i,
    /(active|current|planned|in progress|required)\s+legacy\s+(migration|dual-write|backfill|reconciliation|runtime integration)/i
  ];
  for (const pattern of activeMigrationPatterns) {
    if (pattern.test(text)) fail(`${fileName} appears to treat cancelled legacy migration work as active.`);
  }

  const completedClaims = [
    { name: 'Object/Marker/Association vertical slice', regex: /(Object\/Marker\/Association|Object.*Marker.*Association|vertical slice).*\b(complete|completed|done|closed|fully implemented)\b/i },
    { name: 'legacy admin browser', regex: /legacy admin browser.*\b(complete|completed|done|closed|fully implemented)\b/i },
    { name: 'Firestore Emulator CI', regex: /Firestore Emulator.*\b(runs|running|complete|completed|passed)\b.*\b(GitHub Actions|CI)\b/i }
  ];
  for (const claim of completedClaims) {
    for (const line of text.split('\n')) {
      if (claim.regex.test(line) && !/planned|not complete|not yet|future|pending|required|should run|belongs/i.test(line)) {
        fail(`${fileName} prematurely claims ${claim.name} is complete: ${line.trim()}`);
      }
    }
  }

  const automaticProductionPatterns = [
    /production\s+(deploy|deployment|write|data change|delete).*\b(automatic|automatically|on push|on pull request|on pr)\b/i,
    /\b(automatic|automatically|on push|on pull request|on pr)\b.*production\s+(deploy|deployment|write|data change|delete)/i
  ];
  for (const line of text.split('\n')) {
    if (/do not|manual only|not automatic|never automatic/i.test(line)) continue;
    for (const pattern of automaticProductionPatterns) {
      if (pattern.test(line)) fail(`${fileName} suggests production deploys or production data changes are automatic: ${line.trim()}`);
    }
  }
}

for (const command of ['verify:fast', 'verify:pr', 'verify:release']) {
  if (!allText.includes(command)) fail(`Documentation must describe ${command}.`);
}

if (!/verify:fast[\s\S]{0,160}(local|changed|daily|task)|(?:local|changed|daily|task)[\s\S]{0,160}verify:fast/i.test(allText)) fail('verify:fast must be documented as a lightweight local/changed-work tier.');
if (!/verify:pr[\s\S]{0,160}(PR|pull request|CI)|(?:PR|pull request|CI)[\s\S]{0,160}verify:pr/i.test(allText)) fail('verify:pr must be documented as the PR/CI tier.');
if (!/verify:release[\s\S]{0,160}(release|full|candidate)|(?:release|full|candidate)[\s\S]{0,160}verify:release/i.test(allText)) fail('verify:release must be documented as the release/full validation tier.');
if (/verify:fast[^\n]*(release|full baseline|artifact isolation)/i.test(allText)) fail('verify:fast documentation conflicts with the lightweight tier.');

const prohibitedAbsoluteClaims = [
  /all\s+verification\s+passed/i,
  /all\s+(checks|tests|verification|validations)\s+are\s+(100%|100\s*%)\s+green/i,
  /fully\s+verified\s+in\s+CI/i,
  /GitHub Actions passed/i,
  /CI green/i
];
for (const pattern of prohibitedAbsoluteClaims) {
  if (pattern.test(allText)) fail(`Documentation contains an unscoped transient CI/pass claim: ${pattern}`);
}

console.log('✅ Documentation Reality Gate Passed successfully!');
