import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const functionsSrcIndex = path.join(rootDir, 'functions', 'src', 'index.ts');
const allowlistPath = path.join(rootDir, 'functions', 'deploy-functions.allowlist.json');

const forbiddenExports = [
  'scanExecuteImportedObservationBatch',
  'recomputeProjectionSummary',
  'reconcileProjectionSummary',
  'reconcileProjectionSummaries',
  'migrateImagesToFirestore',
  'addFormatToImages',
  'processOrphanedImages',
  'migrateItemsToObjects'
];

let hasError = false;

// 1. Check exports in index.ts
let indexContent = '';
try {
  indexContent = fs.readFileSync(functionsSrcIndex, 'utf8');
} catch (err) {
  console.error("Missing functions/src/index.ts");
  process.exit(1);
}

const exportedFunctions = [];
const exportRegex = /export\s+\{\s*([^}]+)\s*\}/g;
let match;
while ((match = exportRegex.exec(indexContent)) !== null) {
  const exportsList = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(s => s);
  exportedFunctions.push(...exportsList);
}
// Also catch direct exports like `export const ... =` or `export * from ...`
// Since index.ts usually uses `export { x } from './foo'`, we parse that.
const inlineExportRegex = /export\s+(?:const|function|let|var)\s+([a-zA-Z0-9_]+)/g;
while ((match = inlineExportRegex.exec(indexContent)) !== null) {
  exportedFunctions.push(match[1]);
}

for (const forbidden of forbiddenExports) {
  if (exportedFunctions.includes(forbidden) || indexContent.includes(forbidden)) {
    console.error(`Forbidden export detected in index.ts: ${forbidden}`);
    hasError = true;
  }
}

// 2. Check allowlist
let allowlist;
try {
  allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
} catch (e) {
  console.error("Missing or invalid deploy-functions.allowlist.json");
  process.exit(1);
}
const ownedFunctions = allowlist.ownedFunctions || [];

for (const forbidden of forbiddenExports) {
  if (ownedFunctions.includes(forbidden)) {
    console.error(`Forbidden function found in allowlist: ${forbidden}`);
    hasError = true;
  }
}

// 3. Exact match check
const sortedExports = [...new Set(exportedFunctions)].sort();
const sortedAllowlist = [...new Set(ownedFunctions)].sort();
if (JSON.stringify(sortedExports) !== JSON.stringify(sortedAllowlist)) {
  console.error(`Mismatch between index.ts exports and deploy allowlist.`);
  console.error(`Exports  : ${sortedExports.join(', ')}`);
  console.error(`Allowlist: ${sortedAllowlist.join(', ')}`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
} else {
  console.log("Functions runtime gate passed. No forbidden functions found, exports match allowlist.");
}
