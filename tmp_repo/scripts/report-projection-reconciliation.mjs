import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildProjectionReconciliationReport, formatProjectionReconciliationReport } from './lib/projection-reconciliation-report.mjs';

function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      json: { type: 'boolean' },
      'fail-on-difference': { type: 'boolean' },
      'fail-on-missing-summary': { type: 'boolean' },
      'fail-on-error': { type: 'boolean' },
      'fail-on-attention': { type: 'boolean' },
    },
  });

  if (!values.input) {
    console.error('Error: --input <path> is required');
    process.exit(1);
  }

  const inputPath = path.resolve(values.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input file not found at ${inputPath}`);
    process.exit(1);
  }

  let inputData;
  try {
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    inputData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error: failed to read or parse input JSON: ${err.message}`);
    process.exit(1);
  }

  let report;
  try {
    report = buildProjectionReconciliationReport(inputData);
  } catch (err) {
    console.error(`Error: failed to build report from input data: ${err.message}`);
    process.exit(1);
  }

  const output = formatProjectionReconciliationReport(report, { json: values.json });
  console.log(output);

  // Determine exit code based on flags
  if (values['fail-on-error'] && report.computedCounts.errors > 0) {
    process.exit(1);
  }
  if (values['fail-on-difference'] && report.computedCounts.different > 0) {
    process.exit(1);
  }
  if (values['fail-on-missing-summary'] && report.computedCounts.missingSummary > 0) {
    process.exit(1);
  }
  if (values['fail-on-attention'] && (report.overallStatus === 'attention' || report.overallStatus === 'fail')) {
    process.exit(1);
  }

  process.exit(0);
}

main();
