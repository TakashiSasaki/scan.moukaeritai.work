import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildProjectionBackfillReadinessAssessment, formatProjectionBackfillReadinessAssessment } from './lib/projection-backfill-readiness-assessment.mjs';

function exitWithError(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function parseFlags() {
  try {
    const options = {
      manifest: { type: 'string' },
      'reconciliation-report': { type: 'string', multiple: true },
      'canary-validation': { type: 'string', multiple: true },
      json: { type: 'boolean', default: false },
      'allow-empty-canary-evidence': { type: 'boolean', default: false },
    };

    const { values } = parseArgs({
      options,
      strict: true,
      allowPositionals: false
    });

    return values;
  } catch (error) {
    exitWithError(`CLI Argument Error: ${error.message}\nUsage: node scripts/assess-projection-backfill-readiness.mjs [--manifest <path>] [--reconciliation-report <path>...] [--canary-validation <path>...] [--json] [--allow-empty-canary-evidence]`);
  }
}

function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    exitWithError(`Failed to load or parse JSON file: ${filePath}\n${error.message}`);
  }
}

function main() {
  const flags = parseFlags();

  const isManifestProvided = !!flags.manifest;
  const isDirectEvidenceProvided = (flags['reconciliation-report'] && flags['reconciliation-report'].length > 0) || (flags['canary-validation'] && flags['canary-validation'].length > 0);

  if (isManifestProvided && isDirectEvidenceProvided) {
    exitWithError('Cannot combine --manifest with direct evidence flags (--reconciliation-report, --canary-validation).');
  }

  if (!isManifestProvided && !isDirectEvidenceProvided) {
    exitWithError('At least one evidence file is required (--manifest, --reconciliation-report, or --canary-validation).');
  }

  const assessmentInput = {
    reconciliationReports: [],
    canaryValidationBundles: [],
    notes: []
  };

  if (isManifestProvided) {
    const manifest = loadJsonFile(flags.manifest);
    if (!manifest || typeof manifest !== 'object') {
       exitWithError('Manifest must be a JSON object.');
    }

    if (Array.isArray(manifest.reconciliationReports)) {
      for (const filePath of manifest.reconciliationReports) {
        assessmentInput.reconciliationReports.push(loadJsonFile(filePath));
      }
    }

    if (Array.isArray(manifest.canaryValidationBundles)) {
      for (const filePath of manifest.canaryValidationBundles) {
        assessmentInput.canaryValidationBundles.push(loadJsonFile(filePath));
      }
    }

    if (Array.isArray(manifest.notes)) {
      assessmentInput.notes = manifest.notes;
    }
  } else {
    if (flags['reconciliation-report']) {
      for (const filePath of flags['reconciliation-report']) {
        assessmentInput.reconciliationReports.push(loadJsonFile(filePath));
      }
    }
    if (flags['canary-validation']) {
      for (const filePath of flags['canary-validation']) {
        assessmentInput.canaryValidationBundles.push(loadJsonFile(filePath));
      }
    }
  }

  if (assessmentInput.reconciliationReports.length === 0 && assessmentInput.canaryValidationBundles.length === 0) {
     exitWithError('At least one valid evidence item (report or bundle) must be provided.');
  }

  const assessment = buildProjectionBackfillReadinessAssessment(assessmentInput, {
    allowEmptyCanaryEvidence: flags['allow-empty-canary-evidence'],
    requirePassingCanary: !flags['allow-empty-canary-evidence'] // require passing canary if empty not allowed
  });

  const outputStr = formatProjectionBackfillReadinessAssessment(assessment, { json: flags.json });

  if (flags.json) {
    console.log(outputStr);
  } else {
    console.log(outputStr);
  }

  if (assessment.overallStatus === 'fail' || assessment.overallStatus === 'blocked') {
    process.exit(1);
  } else if (assessment.overallStatus === 'ready-for-backfill-design') {
    process.exit(0);
  } else {
    // Fallback error code for unknown status
    process.exit(1);
  }
}

main();