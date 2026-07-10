import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import {
  buildProjectionBackfillOperationValidationBundle,
  formatProjectionBackfillOperationValidationBundle
} from './lib/projection-backfill-operation-validation-bundle.mjs';
import { normalizeRecomputeArtifact } from './lib/projection-recompute-artifact-loader.mjs';

function main() {
  const { values, positionals } = util.parseArgs({
    options: {
      manifest: {
        type: 'string',
      },
      json: {
        type: 'boolean',
        default: false,
      },
    },
    strict: true,
    allowPositionals: true
  });

  const manifestPath = values.manifest;
  const isJson = values.json;

  if (!manifestPath) {
    if (!isJson) {
      console.error('Error: --manifest <path> is required.');
    }
    process.exit(1);
  }

  let manifestRaw;
  try {
    manifestRaw = fs.readFileSync(path.resolve(manifestPath), 'utf8');
  } catch (err) {
    console.error(`Error: Failed to read manifest file at ${manifestPath}`);
    console.error(err.message);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (err) {
    console.error(`Error: Manifest file at ${manifestPath} is not valid JSON.`);
    process.exit(1);
  }

  // Read the artifacts based on the manifest
  let operationPacket;
  const inputBatches = [];

  const readJsonArtifact = (artifactPath, required = false) => {
    if (!artifactPath) {
      if (required) throw new Error('Required artifact path is empty.');
      return null;
    }
    const fullPath = path.resolve(path.dirname(manifestPath), artifactPath);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`Failed to read artifact at ${fullPath}: ${err.message}`);
    }
  };

  try {
    operationPacket = readJsonArtifact(manifest.operationPacket, true);

    const batchesManifest = manifest.batches || [];
    for (const batchManifest of batchesManifest) {
      const batchInput = {
        batchIndex: batchManifest.batchIndex
      };

      if (batchManifest.preReconciliationResponse) {
         batchInput.preReconciliationResponse = readJsonArtifact(batchManifest.preReconciliationResponse);
      }
      if (batchManifest.postReconciliationResponse) {
         batchInput.postReconciliationResponse = readJsonArtifact(batchManifest.postReconciliationResponse);
      }
      if (batchManifest.reconciliationReport) {
         batchInput.reconciliationReport = readJsonArtifact(batchManifest.reconciliationReport);
      }

      if (batchManifest.recomputeResponse && batchManifest.recomputeResponses) {
         throw new Error(`Do not provide both recomputeResponse and recomputeResponses for batchIndex ${batchManifest.batchIndex}.`);
      }

      batchInput.recomputeResponses = [];

      if (batchManifest.recomputeResponse) {
         const parsed = readJsonArtifact(batchManifest.recomputeResponse, true);
         batchInput.recomputeResponses.push(...normalizeRecomputeArtifact(parsed));
      } else {
         const recomputePaths = batchManifest.recomputeResponses || [];
         for (const rp of recomputePaths) {
            const parsed = readJsonArtifact(rp, true);
            batchInput.recomputeResponses.push(...normalizeRecomputeArtifact(parsed));
         }
      }

      inputBatches.push(batchInput);
    }
  } catch (err) {
    if (isJson) {
       console.log(JSON.stringify({
         success: false,
         valid: false,
         bundleType: "projection-backfill-operation-validation-bundle",
         overallStatus: "fail",
         blockers: [
           { code: "artifact-read-error", message: err.message }
         ],
         warnings: [
           { code: "not-execution", message: "This validation bundle does not execute backfill." },
           { code: "no-ui-switching", message: "This validation bundle does not authorize UI read switching." }
         ],
         written: false
       }, null, 2));
    } else {
       console.error(`Error processing manifest artifacts: ${err.message}`);
    }
    process.exit(1);
  }

  const bundle = buildProjectionBackfillOperationValidationBundle({
    operationPacket,
    batches: inputBatches,
    notes: manifest.notes
  });

  const outStr = formatProjectionBackfillOperationValidationBundle(bundle, { json: isJson });
  console.log(outStr);

  if (bundle.overallStatus === 'fail' || bundle.overallStatus === 'blocked' || !bundle.success) {
    process.exit(1);
  }

  process.exit(0);
}

main();
