import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  buildProjectionCanaryValidationBundle,
  formatProjectionCanaryValidationBundle
} from './lib/projection-canary-validation-bundle.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const options = {
    plan: { type: 'string' },
    'post-write': { type: 'string' },
    'pre-write': { type: 'string' },
    json: { type: 'boolean', default: false },
    'fail-on-empty': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  };

  const { values } = parseArgs({ options, allowPositionals: true });

  if (values.help || !values.plan || !values['post-write']) {
    console.log(`
Usage: node validate-projection-canary-writes.mjs --plan <path> --post-write <path> [options]

Options:
  --plan <path>          Required. JSON file containing canary write plan.
  --post-write <path>    Required. JSON file containing post-write reconciliation response or report.
  --pre-write <path>     Optional. JSON file containing pre-write reconciliation response or report.
  --json                 Output normalized validation bundle as JSON.
  --fail-on-empty        Exit non-zero if plan selected zero targets.
  --help                 Show this help message.
`);
    process.exit(values.help ? 0 : 1);
  }

  let planInput;
  try {
    const p = path.resolve(process.cwd(), values.plan);
    const content = fs.readFileSync(p, 'utf8');
    planInput = JSON.parse(content);
  } catch (err) {
    console.error(`Error reading plan file: ${err.message}`);
    process.exit(1);
  }

  let postWriteInput;
  try {
    const p = path.resolve(process.cwd(), values['post-write']);
    const content = fs.readFileSync(p, 'utf8');
    postWriteInput = JSON.parse(content);
  } catch (err) {
    console.error(`Error reading post-write file: ${err.message}`);
    process.exit(1);
  }

  let preWriteInput;
  if (values['pre-write']) {
    try {
      const p = path.resolve(process.cwd(), values['pre-write']);
      const content = fs.readFileSync(p, 'utf8');
      preWriteInput = JSON.parse(content);
    } catch (err) {
      console.error(`Error reading pre-write file: ${err.message}`);
      process.exit(1);
    }
  }

  const bundle = buildProjectionCanaryValidationBundle({
    plan: planInput,
    postWrite: postWriteInput,
    preWrite: preWriteInput
  });

  const output = formatProjectionCanaryValidationBundle(bundle, { json: values.json });

  if (values.json) {
    console.log(output);
  } else {
    // Only print human-readable output if not json to keep json output pure
    console.log(output);
  }

  if (bundle.overallStatus === 'fail' || !bundle.success) {
    process.exit(1);
  }

  if (bundle.overallStatus === 'empty' && values['fail-on-empty']) {
    process.exit(1);
  }

  process.exit(0);
}

main();
