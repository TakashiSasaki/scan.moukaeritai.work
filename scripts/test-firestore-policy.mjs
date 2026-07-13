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

/**
 * Verifies rules and indexes content. Throws an error on failure.
 */
export function verifyRules(rulesContent, indexesContent) {
  // 1. Bracket and Parenthesis basic structural validation
  let openBraces = 0;
  let openParens = 0;
  for (let i = 0; i < rulesContent.length; i++) {
    const char = rulesContent[i];
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '(') openParens++;
    else if (char === ')') openParens--;

    if (openBraces < 0) throw new Error('Mismatched curly braces (extra close brace).');
    if (openParens < 0) throw new Error('Mismatched parentheses (extra close parenthesis).');
  }
  if (openBraces !== 0) throw new Error(`Mismatched curly braces (unclosed braces: ${openBraces}).`);
  if (openParens !== 0) throw new Error(`Mismatched parentheses (unclosed parentheses: ${openParens}).`);

  // 2. Global default deny
  const hasGlobalDeny = rulesContent.includes('match /{document=**}') && 
    (rulesContent.includes('allow read, write: if false;') || rulesContent.includes('allow read,write: if false;'));
  if (!hasGlobalDeny) {
    throw new Error('No global default deny Net ("match /{document=**} { allow read, write: if false; }") found.');
  }

  // 3. Client write should be false for facts and projections
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
      throw new Error(`Collection "${collection}" is missing its matching match block (e.g. "match /${collection}/{...} { ... }").`);
    }
    
    const matchMatch = rulesContent.match(regexMatch);
    const matchIndex = matchMatch.index;
    const startIndex = matchIndex + matchMatch[0].lastIndexOf('{');
    
    let bracesCount = 0;
    let blockContent = '';
    for (let i = startIndex; i < rulesContent.length; i++) {
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
      throw new Error(`Collection "${collection}" has explicit "allow ...: if true" rule.`);
    }

    const allowLines = blockContent.split('\n').filter(line => line.trim().startsWith('allow '));
    for (const line of allowLines) {
      const isWrite = line.includes('write') || line.includes('create') || line.includes('update') || line.includes('delete');
      if (isWrite) {
        if (!line.includes('if false;')) {
          throw new Error(`Potential insecure client write permission in collection "${collection}": "${line.trim()}"`);
        }
      }
    }
  }

  // 4. Check for "allow write: if true" globally
  const hasAllowWriteIfTrue = /allow\s+write\s*:\s*if\s+true/i.test(rulesContent);
  if (hasAllowWriteIfTrue) {
    throw new Error('Global or local "allow write: if true" rule detected. Write permissions must be strictly scoped.');
  }

  // 5. Verify indexes is valid JSON and clean
  let indexesData;
  try {
    indexesData = JSON.parse(indexesContent);
  } catch (e) {
    throw new Error(`firestore.indexes.json is not valid JSON: ${e.message}`);
  }

  if (!indexesData.indexes || !Array.isArray(indexesData.indexes)) {
    throw new Error('Missing "indexes" array in firestore.indexes.json');
  }

  // 6. Ensure no field duplication and no index duplication
  const seenIndexes = new Set();
  for (let idx = 0; idx < indexesData.indexes.length; idx++) {
    const index = indexesData.indexes[idx];
    const collectionGroup = index.collectionGroup;
    const queryScope = index.queryScope;
    if (!collectionGroup || !queryScope) {
      throw new Error(`Index at position ${idx} is missing collectionGroup or queryScope`);
    }
    
    const fields = index.fields;
    if (!Array.isArray(fields)) {
      throw new Error(`Index for "${collectionGroup}" is missing "fields" array`);
    }
    
    const seenFieldsInIndex = new Set();
    const indexFieldsRepr = [];
    for (const field of fields) {
      const fieldPath = field.fieldPath;
      if (!fieldPath) {
        throw new Error(`Index field for "${collectionGroup}" is missing fieldPath`);
      }
      if (seenFieldsInIndex.has(fieldPath)) {
        throw new Error(`Field duplication detected in index for "${collectionGroup}": field "${fieldPath}" occurs multiple times.`);
      }
      seenFieldsInIndex.add(fieldPath);
      
      const config = field.order || field.arrayConfig;
      indexFieldsRepr.push(`${fieldPath}:${config}`);
    }
    
    const indexKey = `${collectionGroup}:${queryScope}:${indexFieldsRepr.join('|')}`;
    if (seenIndexes.has(indexKey)) {
      throw new Error(`Duplicate index definition detected: same index defined multiple times: "${indexKey}"`);
    }
    seenIndexes.add(indexKey);
  }

  return true;
}

// Self-Test Execution
function runSelfTests() {
  console.log('🧪 Running static policy validator mutation self-tests...');

  // Read clean baseline fixtures
  const baselineRulesPath = path.join(rootDir, 'firestore.rules');
  const baselineIndexesPath = path.join(rootDir, 'firestore.indexes.json');

  if (!fs.existsSync(baselineRulesPath) || !fs.existsSync(baselineIndexesPath)) {
    fail('Baseline firestore.rules or firestore.indexes.json missing, cannot run self-tests.');
  }

  const cleanRules = fs.readFileSync(baselineRulesPath, 'utf8');
  const cleanIndexes = fs.readFileSync(baselineIndexesPath, 'utf8');

  // Case 1: Baseline rules should pass
  try {
    verifyRules(cleanRules, cleanIndexes);
    console.log('   ✅ Test Case 1 passed: baseline rules and indexes pass validation.');
  } catch (e) {
    fail(`Self-test Case 1 failed: clean rules/indexes failed verification: ${e.message}`);
  }

  // Case 2: associations block deleted -> fail
  try {
    const dirtyRules = cleanRules.replace(/match\s+\/associations\/\{associationId\}/i, 'match /associations_deleted/{associationId}');
    verifyRules(dirtyRules, cleanIndexes);
    fail('Self-test Case 2 failed: deleting associations match block did not cause verification failure.');
  } catch (e) {
    if (e.message.includes('associations') && e.message.includes('missing its matching match block')) {
      console.log('   ✅ Test Case 2 passed: associations block deletion was correctly blocked.');
    } else {
      fail(`Self-test Case 2 failed with unexpected error: ${e.message}`);
    }
  }

  // Case 3: observations write allowed -> fail
  try {
    const dirtyRules = cleanRules.replace(
      'match /observations/{observationId} {',
      'match /observations/{observationId} { allow create: if true;'
    );
    verifyRules(dirtyRules, cleanIndexes);
    fail('Self-test Case 3 failed: observations write permit did not cause verification failure.');
  } catch (e) {
    if (e.message.includes('observations') && (e.message.includes('client write') || e.message.includes('allow ...: if true') || e.message.includes('Mismatched curly braces') || e.message.includes('insecure client write'))) {
      console.log('   ✅ Test Case 3 passed: observations write permissions correctly blocked.');
    } else {
      fail(`Self-test Case 3 failed with unexpected error: ${e.message}`);
    }
  }

  // Case 4: global deny deleted -> fail
  try {
    const dirtyRules = cleanRules.replace('match /{document=**} {', 'match /{document=invalid_match} {');
    verifyRules(dirtyRules, cleanIndexes);
    fail('Self-test Case 4 failed: removing global default deny did not cause verification failure.');
  } catch (e) {
    if (e.message.includes('No global default deny Net')) {
      console.log('   ✅ Test Case 4 passed: global deny deletion correctly blocked.');
    } else {
      fail(`Self-test Case 4 failed with unexpected error: ${e.message}`);
    }
  }

  // Case 5: invalid index JSON -> fail
  try {
    const dirtyIndexes = cleanIndexes + '{\n  "malformed": true';
    verifyRules(cleanRules, dirtyIndexes);
    fail('Self-test Case 5 failed: malformed indexes JSON did not cause verification failure.');
  } catch (e) {
    if (e.message.includes('firestore.indexes.json is not valid JSON')) {
      console.log('   ✅ Test Case 5 passed: malformed indexes JSON correctly blocked.');
    } else {
      fail(`Self-test Case 5 failed with unexpected error: ${e.message}`);
    }
  }

  // Case 6: duplicate index -> fail
  try {
    const parsed = JSON.parse(cleanIndexes);
    if (parsed.indexes && parsed.indexes.length > 0) {
      // Duplicate the first index
      parsed.indexes.push(JSON.parse(JSON.stringify(parsed.indexes[0])));
      const dirtyIndexes = JSON.stringify(parsed, null, 2);
      verifyRules(cleanRules, dirtyIndexes);
      fail('Self-test Case 6 failed: duplicate index definition did not cause verification failure.');
    } else {
      console.log('   ⚠️ Self-test Case 6 skipped: no indexes to duplicate.');
    }
  } catch (e) {
    if (e.message.includes('Duplicate index definition detected')) {
      console.log('   ✅ Test Case 6 passed: duplicate index definition correctly blocked.');
    } else {
      fail(`Self-test Case 6 failed with unexpected error: ${e.message}`);
    }
  }

  console.log('🎉 All static policy validator mutation self-tests passed successfully!');
}

// Main execution
if (process.argv.includes('--self-test')) {
  runSelfTests();
} else {
  // Read real files
  const rulesPath = path.join(rootDir, 'firestore.rules');
  const indexesPath = path.join(rootDir, 'firestore.indexes.json');

  if (!fs.existsSync(rulesPath)) {
    fail('firestore.rules file does not exist.');
  }
  if (!fs.existsSync(indexesPath)) {
    fail('firestore.indexes.json file does not exist.');
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  const indexesContent = fs.readFileSync(indexesPath, 'utf8');

  try {
    verifyRules(rulesContent, indexesContent);
    console.log('✅ Firestore Static Policy Verification Passed Successfully!');
  } catch (e) {
    fail(e.message);
  }
}
