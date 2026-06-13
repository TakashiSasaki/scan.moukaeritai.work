import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { buildProjectionBackfillPlan, formatProjectionBackfillPlan } from './lib/projection-backfill-plan.mjs';

function parseJsonFile(filePath, argName) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading or parsing --${argName} file at ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

function run() {
  const options = {
    readiness: { type: 'string' },
    targets: { type: 'string' },
    'batch-size': { type: 'string' },
    mode: { type: 'string' },
    json: { type: 'boolean' }
  };

  let args;
  try {
    args = parseArgs({ options, strict: false }).values;
  } catch (e) {
    console.error(`Argument parsing error: ${e.message}`);
    process.exit(1);
  }

  const { readiness: readinessPath, targets: targetsPath, 'batch-size': batchSizeStr, mode, json } = args;

  if (!readinessPath) {
    console.error("Missing required argument: --readiness <path>");
    process.exit(1);
  }
  if (!targetsPath) {
    console.error("Missing required argument: --targets <path>");
    process.exit(1);
  }

  const readinessAssessment = parseJsonFile(readinessPath, 'readiness');
  const targetsFile = parseJsonFile(targetsPath, 'targets');

  if (!targetsFile || typeof targetsFile !== 'object' || !Array.isArray(targetsFile.targets)) {
    console.error("Invalid targets file format. Expected an object with a 'targets' array.");
    process.exit(1);
  }

  const planOptions = {};
  if (batchSizeStr) {
    const parsed = parseInt(batchSizeStr, 10);
    if (isNaN(parsed)) {
       console.error("--batch-size must be a number");
       process.exit(1);
    }
    planOptions.batchSize = parsed;
  }
  if (mode) {
    planOptions.mode = mode;
  }

  const input = {
    readinessAssessment,
    targets: targetsFile.targets,
    notes: targetsFile.notes
  };

  const plan = buildProjectionBackfillPlan(input, planOptions);

  if (json) {
    console.log(formatProjectionBackfillPlan(plan, { json: true }));
    process.exit(plan.valid ? 0 : 1);
  }

  console.log(formatProjectionBackfillPlan(plan, { json: false }));

  if (!plan.valid) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
