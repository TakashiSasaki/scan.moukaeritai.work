import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

const esmIndexPath = pathToFileURL(path.join(packageRoot, 'dist', 'esm', 'index.js')).href;
const cjsIndexPath = path.join(packageRoot, 'dist', 'cjs', 'index.js');

const expectedExports = [
  'reconstructObjectSummary',
  'reconstructMarkerSummary',
  'reconstructPlaceSummary',
  'buildFactIndexFields',
  'stripUndefinedDeep',
];

async function validateArtifact() {
  let hasError = false;

  console.log('Validating ESM import...');
  try {
    const esmModule = await import(esmIndexPath);
    for (const exp of expectedExports) {
      if (typeof esmModule[exp] === 'undefined') {
        console.error(`❌ ESM output is missing expected export: ${exp}`);
        hasError = true;
      }
    }
    if (!hasError) console.log('✅ ESM import validated.');
  } catch (err) {
    console.error(`❌ ESM import failed:`, err);
    hasError = true;
  }

  console.log('Validating CJS require...');
  try {
    const require = createRequire(import.meta.url);
    const cjsModule = require(cjsIndexPath);
    for (const exp of expectedExports) {
      if (typeof cjsModule[exp] === 'undefined') {
        console.error(`❌ CJS output is missing expected export: ${exp}`);
        hasError = true;
      }
    }
    if (!hasError) console.log('✅ CJS require validated.');
  } catch (err) {
    console.error(`❌ CJS require failed:`, err);
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  }
}

validateArtifact();
