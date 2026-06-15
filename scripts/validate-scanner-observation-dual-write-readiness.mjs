import fs from 'node:fs';
import util from 'node:util';
import { validateScannerObservationDualWriteReadiness, formatScannerObservationDualWriteReadinessValidation } from './lib/scanner-observation-dual-write-readiness.mjs';

const { values } = util.parseArgs({
  options: {
    readiness: { type: 'string' },
    'closure-plan': { type: 'string' },
    'drift-audit': { type: 'string' },
    json: { type: 'boolean' }
  },
  strict: false
});

if (!values.readiness) {
  console.error("Error: --readiness <path> is required");
  process.exit(1);
}

let readiness;
try {
  readiness = JSON.parse(fs.readFileSync(values.readiness, 'utf8'));
} catch (e) {
  console.error(`Error reading readiness file: ${e.message}`);
  process.exit(1);
}

const result = validateScannerObservationDualWriteReadiness(readiness);

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatScannerObservationDualWriteReadinessValidation(result));
}

if (!result.success || !result.valid) {
  process.exit(1);
}
