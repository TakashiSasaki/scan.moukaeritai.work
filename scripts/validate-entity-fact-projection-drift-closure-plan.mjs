import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import {
  validateEntityFactProjectionDriftClosurePlan,
  formatEntityFactProjectionDriftClosurePlanValidation
} from './lib/entity-fact-projection-drift-closure-plan.mjs';

const { values: args } = util.parseArgs({
  options: {
    plan: {
      type: 'string',
    },
    audit: {
      type: 'string',
    },
    json: {
      type: 'boolean',
    },
  },
  strict: false,
});

if (!args.plan) {
  console.error("Error: --plan <path> is required.");
  process.exit(1);
}

const planPath = path.resolve(process.cwd(), args.plan);

let planJson;
try {
  const content = fs.readFileSync(planPath, 'utf8');
  planJson = JSON.parse(content);
} catch (error) {
  console.error(`Error reading or parsing plan file at ${planPath}:`, error.message);
  process.exit(1);
}

let auditJson;
if (args.audit) {
  const auditPath = path.resolve(process.cwd(), args.audit);
  try {
    const content = fs.readFileSync(auditPath, 'utf8');
    auditJson = JSON.parse(content);
  } catch (error) {
    console.error(`Error reading or parsing audit file at ${auditPath}:`, error.message);
    process.exit(1);
  }
}

const result = validateEntityFactProjectionDriftClosurePlan(planJson, { audit: auditJson });

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatEntityFactProjectionDriftClosurePlanValidation(result));
}

if (result.status === "drift-closure-plan-valid" && result.valid) {
  process.exit(0);
} else {
  process.exit(1);
}
