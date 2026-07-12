import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function fail(msg) {
  console.error(`❌ Firestore Policy Verification Failed: ${msg}`);
  process.exit(1);
}

console.log('🔍 Running Node-only Static Firestore Policy Verification...');

// 1. Read firestore.rules
const rulesPath = path.join(rootDir, 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  fail('firestore.rules file does not exist.');
}

let rulesContent;
try {
  rulesContent = fs.readFileSync(rulesPath, 'utf8');
} catch (e) {
  fail(`Failed to read firestore.rules: ${e.message}`);
}

// 2. Bracket and Parenthesis basic structural validation
let openBraces = 0;
let openParens = 0;
for (let i = 0; i < rulesContent.length; i++) {
  const char = rulesContent[i];
  if (char === '{') openBraces++;
  else if (char === '}') openBraces--;
  else if (char === '(') openParens++;
  else if (char === ')') openParens--;

  if (openBraces < 0) fail('Mismatched curly braces (extra close brace).');
  if (openParens < 0) fail('Mismatched parentheses (extra close parenthesis).');
}
if (openBraces !== 0) fail(`Mismatched curly braces (unclosed braces: ${openBraces}).`);
if (openParens !== 0) fail(`Mismatched parentheses (unclosed parentheses: ${openParens}).`);

// 3. Global default deny
const hasGlobalDeny = rulesContent.includes('match /{document=**}') && 
  (rulesContent.includes('allow read, write: if false;') || rulesContent.includes('allow read,write: if false;'));
if (!hasGlobalDeny) {
  fail('No global default deny Net ("match /{document=**} { allow read, write: if false; }") found.');
}

// 4. Client write should be false for facts and projections
const targetCollections = [
  'associations',
  'observations',
  'measurements',
  'events',
  'objectSummaries',
  'markerSummaries',
  'placeSummaries'
];

for (const collection of targetCollections) {
  const regexMatch = new RegExp(`match\\s+/${collection}/\\{[a-zA-Z0-9_]+\\}\\s*\\{`, 'i');
  if (!regexMatch.test(rulesContent)) {
    continue;
  }
  
  const matchIndex = rulesContent.search(regexMatch);
  let bracesCount = 0;
  let blockContent = '';
  for (let i = matchIndex; i < rulesContent.length; i++) {
    const char = rulesContent[i];
    if (char === '{') {
      bracesCount++;
    } else if (char === '}') {
      bracesCount--;
      if (bracesCount === 0) {
        blockContent = rulesContent.slice(matchIndex, i + 1);
        break;
      }
    }
  }
  
  if (blockContent.includes('allow write: if true') || blockContent.includes('allow create: if true') || blockContent.includes('allow update: if true') || blockContent.includes('allow delete: if true')) {
    fail(`Collection "${collection}" has explicit "allow ...: if true" rule.`);
  }

  const allowLines = blockContent.split('\n').filter(line => line.trim().startsWith('allow '));
  for (const line of allowLines) {
    const isWrite = line.includes('write') || line.includes('create') || line.includes('update') || line.includes('delete');
    if (isWrite) {
      if (!line.includes('if false;')) {
        fail(`Potential insecure client write permission in collection "${collection}": "${line.trim()}"`);
      }
    }
  }
}

// 5. Check for "allow write: if true" globally
const hasAllowWriteIfTrue = /allow\s+write\s*:\s*if\s+true/i.test(rulesContent);
if (hasAllowWriteIfTrue) {
  fail('Global or local "allow write: if true" rule detected. Write permissions must be strictly scoped.');
}

// 6. Verify firestore.indexes.json is valid JSON and clean
const indexesPath = path.join(rootDir, 'firestore.indexes.json');
if (!fs.existsSync(indexesPath)) {
  fail('firestore.indexes.json file does not exist.');
}

let indexesData;
try {
  const content = fs.readFileSync(indexesPath, 'utf8');
  indexesData = JSON.parse(content);
} catch (e) {
  fail(`firestore.indexes.json is not valid JSON: ${e.message}`);
}

if (!indexesData.indexes || !Array.isArray(indexesData.indexes)) {
  fail('Missing "indexes" array in firestore.indexes.json');
}

// 7. Ensure no field duplication and no index duplication
const seenIndexes = new Set();
for (let idx = 0; idx < indexesData.indexes.length; idx++) {
  const index = indexesData.indexes[idx];
  const collectionGroup = index.collectionGroup;
  const queryScope = index.queryScope;
  if (!collectionGroup || !queryScope) {
    fail(`Index at position ${idx} is missing collectionGroup or queryScope`);
  }
  
  const fields = index.fields;
  if (!Array.isArray(fields)) {
    fail(`Index for "${collectionGroup}" is missing "fields" array`);
  }
  
  const seenFieldsInIndex = new Set();
  const indexFieldsRepr = [];
  for (const field of fields) {
    const fieldPath = field.fieldPath;
    if (!fieldPath) {
      fail(`Index field for "${collectionGroup}" is missing fieldPath`);
    }
    if (seenFieldsInIndex.has(fieldPath)) {
      fail(`Field duplication detected in index for "${collectionGroup}": field "${fieldPath}" occurs multiple times.`);
    }
    seenFieldsInIndex.add(fieldPath);
    
    const config = field.order || field.arrayConfig;
    indexFieldsRepr.push(`${fieldPath}:${config}`);
  }
  
  const indexKey = `${collectionGroup}:${queryScope}:${indexFieldsRepr.join('|')}`;
  if (seenIndexes.has(indexKey)) {
    fail(`Duplicate index definition detected: same index defined multiple times: "${indexKey}"`);
  }
  seenIndexes.add(indexKey);
}

console.log('✅ Firestore Static Policy Verification Passed Successfully!');
