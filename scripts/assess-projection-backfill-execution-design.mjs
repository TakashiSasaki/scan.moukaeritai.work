import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';
import { buildProjectionBackfillExecutionDesignGate, formatProjectionBackfillExecutionDesignGate } from './lib/projection-backfill-execution-design-gate.mjs';

function parseArgs() {
  const { values } = util.parseArgs({
    options: {
      manifest: { type: 'string' },
      json: { type: 'boolean' },
      'allow-dry-run-only': { type: 'boolean' },
      'allow-duplicate-target-evidence': { type: 'boolean' }
    },
    strict: false,
  });
  return values;
}

async function main() {
  let args;
  try {
    args = parseArgs();
  } catch (err) {
    console.error(`Error parsing arguments: ${err.message}`);
    process.exit(1);
  }

  const isJson = args.json === true;

  if (!args.manifest) {
    if (isJson) {
       console.error(JSON.stringify({ error: "--manifest is required." }));
    } else {
       console.error("Error: --manifest is required.");
    }
    process.exit(1);
  }

  let manifestData;
  try {
    const raw = fs.readFileSync(args.manifest, 'utf-8');
    manifestData = JSON.parse(raw);
  } catch (err) {
    if (isJson) {
       console.error(JSON.stringify({ error: `Could not read or parse manifest: ${err.message}` }));
    } else {
       console.error(`Error: Could not read or parse manifest at ${args.manifest}: ${err.message}`);
    }
    process.exit(1);
  }

  const validationBundles = [];
  const manifestDir = path.dirname(args.manifest);

  if (manifestData.validationBundles && Array.isArray(manifestData.validationBundles)) {
     for (const relPath of manifestData.validationBundles) {
        const fullPath = path.resolve(manifestDir, relPath);
        try {
           const rawBundle = fs.readFileSync(fullPath, 'utf-8');
           validationBundles.push(JSON.parse(rawBundle));
        } catch (err) {
           if (isJson) {
              console.error(JSON.stringify({ error: `Could not read or parse referenced bundle: ${relPath} - ${err.message}` }));
           } else {
              console.error(`Error: Could not read or parse referenced bundle: ${relPath} - ${err.message}`);
           }
           process.exit(1);
        }
     }
  }

  const input = {
    validationBundles,
    notes: manifestData.notes,
    environment: manifestData.environment,
    operator: manifestData.operator
  };

  const options = {
    requireManualWriteEvidence: !args['allow-dry-run-only'],
    allowDuplicateTargetEvidence: args['allow-duplicate-target-evidence'] === true
  };

  const gate = buildProjectionBackfillExecutionDesignGate(input, options);

  if (isJson) {
    console.log(formatProjectionBackfillExecutionDesignGate(gate, { json: true }));
  } else {
    console.log(formatProjectionBackfillExecutionDesignGate(gate));
  }

  if (gate.overallStatus === 'ready-for-execution-design') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
