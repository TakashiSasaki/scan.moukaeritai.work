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

let closurePlan;
if (values['closure-plan']) {
  try {
    closurePlan = JSON.parse(fs.readFileSync(values['closure-plan'], 'utf8'));
  } catch (e) {
    console.error(`Error reading closure-plan file: ${e.message}`);
    process.exit(1);
  }
}

let driftAudit;
if (values['drift-audit']) {
  try {
    driftAudit = JSON.parse(fs.readFileSync(values['drift-audit'], 'utf8'));
  } catch (e) {
    console.error(`Error reading drift-audit file: ${e.message}`);
    process.exit(1);
  }
}

const options = {
  closurePlan,
  driftAudit
};

const result = validateScannerObservationDualWriteReadiness(readiness, options);

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatScannerObservationDualWriteReadinessValidation(result));
}

if (!result.success || !result.valid) {
  process.exit(1);
}
