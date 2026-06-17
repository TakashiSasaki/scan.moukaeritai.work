import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    evidence: {
      type: 'string',
      short: 'e',
    },
    json: {
      type: 'boolean',
    },
  },
});

if (!values.evidence) {
  console.error('Usage: node validate-scanner-observation-dual-write-runtime-contract-evidence.mjs --evidence <path/to/evidence.json>');
  process.exit(1);
}

const evidencePath = path.resolve(process.cwd(), values.evidence);
let evidence;

try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (e) {
  console.error(`Failed to read evidence at ${evidencePath}:`, e.message);
  process.exit(1);
}

const invariants = {
  evidenceType: 'scanner-observation-dual-write-runtime-contract-evidence',
  status: 'local-evidence-only',
  targetObservationsRulesHardened: true,
  builderFlatSchemaAligned: true,
  builderDescriptorIncludesPath: true,
  runtimeShadowWriterFeatureGated: true,
  unsupportedSourcesRejected: true,
  featureFlagEnabled: false,
  runtimeDefaultBehaviorChanged: false,
  indexesChanged: false,
  migrationExecuted: false,
  readSwitchingAuthorized: false,
  rolloutApproved: false,
  legacyIdentifierObservationsChanged: false,
  objectEventsAuthoritative: true,
  missingOrUnownedObjectIdOmitted: true,
  markerOwnershipRequired: true
};

const errors = [];

for (const [key, expected] of Object.entries(invariants)) {
  if (evidence[key] !== expected) {
    errors.push(`Invariant violation: Expected '${key}' to strictly equal ${expected}, but got ${evidence[key]}`);
  }
}

if (errors.length > 0) {
  if (values.json) {
    console.log(JSON.stringify({ status: 'fail', errors }, null, 2));
  } else {
    console.error('Validation failed with the following invariant violations:');
    errors.forEach(err => console.error(` - ${err}`));
  }
  process.exit(1);
}

if (values.json) {
  console.log(JSON.stringify({ status: 'pass' }, null, 2));
} else {
  console.log('Validation passed: All runtime contract invariants are satisfied.');
}
