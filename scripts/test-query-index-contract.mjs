import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const requirement = {
  collectionGroup: 'associations',
  fields: [
    { fieldPath: 'ownerId', order: 'ASCENDING' },
    { fieldPath: 'subjectAssociationId', order: 'ASCENDING' }
  ],
  sourceNeedles: [
    '.where("subjectAssociationId", "==", subjectAssociationId)',
    '.where("ownerId", "==", ownerId)'
  ]
};

function validate({ indexesContent, sourceContent }) {
  for (const needle of requirement.sourceNeedles) {
    if (!sourceContent.includes(needle)) throw new Error(`Missing query requirement: ${needle}`);
  }
  const requiredIndex = indexesContent.indexes.find(idx =>
    idx.collectionGroup === requirement.collectionGroup &&
    requirement.fields.every(req => idx.fields.some(f => f.fieldPath === req.fieldPath && f.order === req.order))
  );
  if (!requiredIndex) throw new Error('Missing required index: ownerId ASCENDING, subjectAssociationId ASCENDING on associations collection');
}

if (process.argv.includes('--self-test')) {
  const goodIndexes = { indexes: [{ collectionGroup:'associations', queryScope:'COLLECTION', fields: requirement.fields }] };
  const goodSource = 'q.where("subjectAssociationId", "==", subjectAssociationId).where("ownerId", "==", ownerId)';
  validate({ indexesContent: goodIndexes, sourceContent: goodSource });
  let failed = false;
  try { validate({ indexesContent: { indexes: [] }, sourceContent: goodSource }); } catch { failed = true; }
  if (!failed) throw new Error('Self-test failed: required index deletion did not fail');
  failed = false;
  try { validate({ indexesContent: goodIndexes, sourceContent: 'q.where("subjectAssociationId", "==", subjectAssociationId)' }); } catch { failed = true; }
  if (!failed) throw new Error('Self-test failed: query field change did not fail');
  console.log('Query index contract self-test passed.');
} else {
  validate({
    indexesContent: JSON.parse(fs.readFileSync(path.join(rootDir, 'firestore.indexes.json'), 'utf8')),
    sourceContent: fs.readFileSync(path.join(rootDir, 'functions/src/submitFactCommand.ts'), 'utf8')
  });
  console.log('Query index contract check passed.');
}
