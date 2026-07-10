import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';
import { buildProjectionBackfillControlledExecutionDesignPacket, formatProjectionBackfillControlledExecutionDesignPacket } from './lib/projection-backfill-controlled-execution-design-packet.mjs';

function parseArgs() {
  const { values } = util.parseArgs({
    options: {
      gate: { type: 'string' },
      'operation-validation-bundle': { type: 'string', multiple: true },
      environment: { type: 'string' },
      operator: { type: 'string' },
      json: { type: 'boolean' }
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

  if (!args.gate) {
    if (isJson) {
       console.error(JSON.stringify({ error: "--gate is required." }));
    } else {
       console.error("Error: --gate is required.");
    }
    process.exit(1);
  }

  if (!args['operation-validation-bundle'] || args['operation-validation-bundle'].length === 0) {
    if (isJson) {
       console.error(JSON.stringify({ error: "--operation-validation-bundle is required (at least one)." }));
    } else {
       console.error("Error: --operation-validation-bundle is required (at least one).");
    }
    process.exit(1);
  }

  let gateData;
  try {
    const raw = fs.readFileSync(args.gate, 'utf-8');
    gateData = JSON.parse(raw);
  } catch (err) {
    if (isJson) {
       console.error(JSON.stringify({ error: `Could not read or parse gate manifest at ${args.gate}: ${err.message}` }));
    } else {
       console.error(`Error: Could not read or parse gate manifest at ${args.gate}: ${err.message}`);
    }
    process.exit(1);
  }

  const bundlesData = [];
  for (const bundlePath of args['operation-validation-bundle']) {
    try {
      const raw = fs.readFileSync(bundlePath, 'utf-8');
      bundlesData.push(JSON.parse(raw));
    } catch (err) {
      if (isJson) {
         console.error(JSON.stringify({ error: `Could not read or parse operation validation bundle at ${bundlePath}: ${err.message}` }));
      } else {
         console.error(`Error: Could not read or parse operation validation bundle at ${bundlePath}: ${err.message}`);
      }
      process.exit(1);
    }
  }

  const input = {
    executionDesignGate: gateData,
    operationValidationBundles: bundlesData,
    environment: args.environment || "unknown",
    operator: args.operator || "unknown"
  };

  const packet = buildProjectionBackfillControlledExecutionDesignPacket(input);

  if (isJson) {
    console.log(formatProjectionBackfillControlledExecutionDesignPacket(packet, { json: true }));
  } else {
    console.log(formatProjectionBackfillControlledExecutionDesignPacket(packet));
  }

  if (packet.overallStatus === 'ready-for-controlled-execution-design-review') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
