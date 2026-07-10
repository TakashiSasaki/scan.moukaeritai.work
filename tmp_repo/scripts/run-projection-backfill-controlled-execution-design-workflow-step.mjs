import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { spawnSync } from 'node:child_process';

function parseArgs() {
  const { values } = util.parseArgs({
    options: {
      'execution-design-manifest': { type: 'string' },
      gate: { type: 'string' },
      'output-dir': { type: 'string' },
      environment: { type: 'string' },
      operator: { type: 'string' }
    },
    strict: false,
  });
  return values;
}

function main() {
  const args = parseArgs();

  if (!args['execution-design-manifest'] || !args.gate || !args['output-dir']) {
    console.error("Error: --execution-design-manifest, --gate, and --output-dir are required.");
    process.exit(1);
  }

  const manifestPath = args['execution-design-manifest'];
  const manifestDir = path.dirname(manifestPath);
  const envLabel = args.environment || 'unknown';
  const operatorLabel = args.operator || 'github-actions';

  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (e) {
    console.error(`Error: Could not read or parse manifest at ${manifestPath}: ${e.message}`);
    process.exit(1);
  }

  const bundles = manifest.validationBundles || [];
  if (bundles.length === 0) {
    console.error('Error: validationBundles is missing or empty in the execution design manifest.');
    process.exit(1);
  }

  const bundleArgs = [];
  for (const bundleRel of bundles) {
    let bundlePath = path.join(manifestDir, bundleRel);
    if (!fs.existsSync(bundlePath)) {
      if (fs.existsSync(bundleRel)) {
         bundlePath = bundleRel;
      } else {
         console.error(`Error: Validation bundle path cannot be resolved: ${bundleRel}`);
         process.exit(1); // Fail fast
      }
    }
    bundleArgs.push('--operation-validation-bundle', bundlePath);
  }

  // Ensure output dir exists
  if (!fs.existsSync(args['output-dir'])) {
      fs.mkdirSync(args['output-dir'], { recursive: true });
  }

  const baseArgs = [
     'scripts/prepare-projection-backfill-controlled-execution-design.mjs',
     '--gate', args.gate,
     ...bundleArgs,
     '--environment', envLabel,
     '--operator', operatorLabel
  ];

  console.log(`Running: node ${baseArgs.join(' ')}`);

  const jsonResult = spawnSync(process.execPath, [...baseArgs, '--json'], { encoding: 'utf8' });
  if (jsonResult.status === 0) {
     fs.writeFileSync(path.join(args['output-dir'], 'controlled-execution-design-packet.json'), jsonResult.stdout);

     // Also parse to check status
     try {
       const packet = JSON.parse(jsonResult.stdout);
       if (packet.overallStatus !== 'ready-for-controlled-execution-design-review') {
          console.error(`Error: Generated packet overallStatus is not ready-for-controlled-execution-design-review (got ${packet.overallStatus})`);
          process.exit(1);
       }
     } catch (e) {
       console.error(`Error parsing generated packet JSON: ${e.message}`);
       process.exit(1);
     }
  } else {
     console.error('Error generating JSON packet:');
     console.error(jsonResult.stderr || jsonResult.stdout);
     process.exit(1);
  }

  const mdResult = spawnSync(process.execPath, baseArgs, { encoding: 'utf8' });
  if (mdResult.status === 0) {
     fs.writeFileSync(path.join(args['output-dir'], 'controlled-execution-design-summary.md'), mdResult.stdout);
  } else {
     console.error('Error generating markdown summary:');
     console.error(mdResult.stderr || mdResult.stdout);
     process.exit(1);
  }
}

main();
