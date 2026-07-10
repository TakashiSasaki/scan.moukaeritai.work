import { readFileSync } from 'fs';
import { parseArgs } from 'util';
import { buildProjectionCanaryWritePlan, formatProjectionCanaryWritePlan } from './lib/projection-canary-write-plan.mjs';

const argsOptions = {
  input: {
    type: 'string',
  },
  json: {
    type: 'boolean',
  },
  'max-targets': {
    type: 'string',
  },
  'allow-missing-summary': {
    type: 'boolean',
  },
  'no-include-equal': {
    type: 'boolean',
  },
  'fail-if-empty': {
    type: 'boolean',
  }
};

let parsed;
try {
  parsed = parseArgs({
    options: argsOptions,
    strict: true,
  });
} catch (err) {
  console.error(`Error parsing arguments: ${err.message}`);
  process.exit(1);
}

const { values } = parsed;

if (!values.input) {
  console.error('Error: --input <path> is required.');
  process.exit(1);
}

let inputData;
try {
  const content = readFileSync(values.input, 'utf-8');
  inputData = JSON.parse(content);
} catch (err) {
  console.error(`Error reading or parsing input file: ${err.message}`);
  process.exit(1);
}

const options = {};
if (values['max-targets'] !== undefined) {
  const num = parseInt(values['max-targets'], 10);
  if (isNaN(num)) {
    console.error('Error: --max-targets must be a number.');
    process.exit(1);
  }
  options.maxTargets = num;
}
if (values['allow-missing-summary']) {
  options.allowMissingSummary = true;
}
if (values['no-include-equal']) {
  options.includeEqual = false;
}

const plan = buildProjectionCanaryWritePlan(inputData, options);
const output = formatProjectionCanaryWritePlan(plan, { json: values.json });

console.log(output);

if (!plan.valid) {
  process.exit(1);
}

if (values['fail-if-empty'] && plan.selectedCount === 0) {
  process.exit(1);
}

process.exit(0);
