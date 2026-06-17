import { readFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { validateScannerObservationDualWriteRolloutDesignGate } from './lib/validate-scanner-observation-dual-write-rollout-design-gate.mjs';

function parseCliArgs() {
  const { values, positionals } = parseArgs({
    options: {
      design: { type: 'string' },
      'runtime-contract-evidence': { type: 'string' },
      readiness: { type: 'string' },
      'target-rules-design': { type: 'string' },
      json: { type: 'boolean', default: false }
    },
    strict: false // Allow unknown arguments
  });
  return values;
}

function loadJsonArtifact(path, name, errors) {
  if (!path) {
    errors.push(`Missing path for ${name}.`);
    return null;
  }
  if (!existsSync(path)) {
    errors.push(`Referenced artifact path does not exist for ${name}: ${path}`);
    return null;
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Failed to parse JSON for ${name} at ${path}: ${error.message}`);
    return null;
  }
}

function run() {
  const args = parseCliArgs();
  const errors = [];

  const designPayload = loadJsonArtifact(args.design, 'design', errors);
  const runtimeContractEvidencePayload = loadJsonArtifact(args['runtime-contract-evidence'], 'runtime-contract-evidence', errors);
  const readinessPayload = loadJsonArtifact(args.readiness, 'readiness', errors);
  const targetRulesDesignPayload = loadJsonArtifact(args['target-rules-design'], 'target-rules-design', errors);

  if (errors.length > 0) {
    if (args.json) {
      console.log(JSON.stringify({ status: 'fail', errors }, null, 2));
    } else {
      console.error('Validation failed due to file loading errors:');
      errors.forEach(err => console.error(` - ${err}`));
    }
    process.exit(1);
  }

  const result = validateScannerObservationDualWriteRolloutDesignGate({
    designPayload,
    runtimeContractEvidencePayload,
    readinessPayload,
    targetRulesDesignPayload
  });

  if (args.json) {
    if (result.valid) {
      console.log(JSON.stringify({
        status: 'pass',
        warnings: result.warnings,
        safetyNotes: result.safetyNotes
      }, null, 2));
      process.exit(0);
    } else {
      console.log(JSON.stringify({
        status: 'fail',
        errors: result.errors,
        warnings: result.warnings
      }, null, 2));
      process.exit(1);
    }
  } else {
    if (result.valid) {
      console.log('Scanner Observation Dual-Write Rollout Design Gate validation PASSED.');
      if (result.safetyNotes.length > 0) {
         console.log('\nSafety Notes:');
         result.safetyNotes.forEach(note => console.log(` - ${note}`));
      }
      if (result.warnings.length > 0) {
         console.log('\nWarnings:');
         result.warnings.forEach(warn => console.log(` - ${warn}`));
      }
      process.exit(0);
    } else {
      console.error('Scanner Observation Dual-Write Rollout Design Gate validation FAILED.');
      console.error('\nErrors:');
      result.errors.forEach(err => console.error(` - ${err}`));
      if (result.warnings.length > 0) {
         console.error('\nWarnings:');
         result.warnings.forEach(warn => console.error(` - ${warn}`));
      }
      process.exit(1);
    }
  }
}

run();
