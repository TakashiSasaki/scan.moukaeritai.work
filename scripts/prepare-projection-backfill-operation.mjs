/**
 * CLI tool for preparing a projection backfill operation packet.
 * This is an offline helper that does not call Firebase or execute backfills.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  buildProjectionBackfillOperationPacket,
  formatProjectionBackfillOperationPacket
} from './lib/projection-backfill-operation-packet.mjs';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseJSON(filepath, name) {
  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    fail(`Failed to read or parse ${name} file at ${filepath}: ${err.message}`);
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        readiness: { type: 'string' },
        targets: { type: 'string' },
        plan: { type: 'string' },
        mode: { type: 'string' },
        'batch-size': { type: 'string' },
        environment: { type: 'string' },
        operator: { type: 'string' },
        json: { type: 'boolean' }
      },
      strict: true
    });
  } catch (err) {
    fail(`Argument parsing error: ${err.message}`);
  }

  const { values } = parsed;

  if (!values.readiness) {
    fail('--readiness is required.');
  }

  if (values.targets && values.plan) {
    fail('Provide either --targets or --plan, but not both.');
  }

  if (!values.targets && !values.plan) {
    fail('At least one of --targets or --plan is required.');
  }

  const readinessAssessment = parseJSON(path.resolve(values.readiness), '--readiness');

  let targetsData = null;
  let backfillPlan = null;
  let notes = [];

  if (values.targets) {
    const parsedTargets = parseJSON(path.resolve(values.targets), '--targets');
    targetsData = parsedTargets.targets || [];
    if (parsedTargets.notes && Array.isArray(parsedTargets.notes)) {
      notes.push(...parsedTargets.notes);
    }
  }

  if (values.plan) {
    backfillPlan = parseJSON(path.resolve(values.plan), '--plan');
  }

  const input = {
    readinessAssessment,
    targets: targetsData,
    backfillPlan,
    notes
  };

  const options = {
    operator: values.operator,
    environment: values.environment
  };

  if (values.mode) {
    options.mode = values.mode;
  }

  if (values['batch-size']) {
    if (!/^\d+$/.test(values['batch-size'])) {
      fail(`Invalid batch-size: ${values['batch-size']}. Must be a positive integer.`);
    }
    const bs = parseInt(values['batch-size'], 10);
    if (isNaN(bs)) {
      fail(`Invalid batch-size: ${values['batch-size']}`);
    }
    options.batchSize = bs;
  }

  const packet = buildProjectionBackfillOperationPacket(input, options);

  const out = formatProjectionBackfillOperationPacket(packet, { json: values.json });

  if (!packet.valid) {
    if (values.json) {
      console.log(out);
    } else {
      console.error(out);
    }
    process.exit(1);
  }

  console.log(out);
}

main().catch(err => {
  fail(err.message);
});
