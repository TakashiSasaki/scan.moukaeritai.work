import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const functionsPackageJsonPath = path.join(rootDir, 'functions', 'package.json');

console.log('Validating @scan/efp-model consumption from functions package context...');

const requireFromFunctions = createRequire(functionsPackageJsonPath);

let efpModel;
try {
  efpModel = requireFromFunctions('@scan/efp-model');
} catch (err) {
  console.error('❌ Failed to require("@scan/efp-model") from functions context.');
  console.error(err);
  process.exit(1);
}

const expectedExports = [
  'reconstructObjectSummary',
  'reconstructMarkerSummary',
  'reconstructPlaceSummary',
  'buildFactIndexFields',
  'stripUndefinedDeep'
];

let hasError = false;
for (const exp of expectedExports) {
  if (typeof efpModel[exp] === 'undefined') {
    console.error(`❌ @scan/efp-model is missing expected export: ${exp}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('❌ Validation failed.');
  process.exit(1);
}

console.log('✅ Functions shared EFP model dependency validated successfully.');
