import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import {
  validateEntityFactProjectionDriftAudit,
  formatEntityFactProjectionDriftAuditValidation
} from './lib/entity-fact-projection-drift-audit.mjs';

const { values: args } = util.parseArgs({
  options: {
    audit: {
      type: 'string',
    },
    json: {
      type: 'boolean',
    },
  },
  strict: false,
});

if (!args.audit) {
  console.error("Error: --audit <path> is required.");
  process.exit(1);
}

const auditPath = path.resolve(process.cwd(), args.audit);

let auditJson;
try {
  const content = fs.readFileSync(auditPath, 'utf8');
  auditJson = JSON.parse(content);
} catch (error) {
  console.error(`Error reading or parsing audit file at ${auditPath}:`, error.message);
  process.exit(1);
}

const result = validateEntityFactProjectionDriftAudit(auditJson);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(formatEntityFactProjectionDriftAuditValidation(result));
}

if (result.status === "drift-audit-valid" && result.valid) {
  process.exit(0);
} else {
  process.exit(1);
}
