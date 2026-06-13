import { buildProjectionReconciliationReport } from './projection-reconciliation-report.mjs';

/**
 * Builds a conservative projection backfill readiness assessment.
 * @param {object} input
 * @param {Array<any>} [input.reconciliationReports]
 * @param {Array<any>} [input.canaryValidationBundles]
 * @param {string[]} [input.notes]
 * @param {object} options
 * @param {string[]} [options.requiredTargetTypes=["object", "marker", "place"]]
 * @param {boolean} [options.requirePassingCanary=true]
 * @param {boolean} [options.allowEmptyCanaryEvidence=false]
 * @returns {object} The assessment result.
 */
export function buildProjectionBackfillReadinessAssessment(input, options = {}) {
  const {
    requiredTargetTypes = ["object", "marker", "place"],
    requirePassingCanary = true,
    allowEmptyCanaryEvidence = false
  } = options;

  if (!input || typeof input !== 'object') {
    return createFailedAssessment("Invalid input object.");
  }

  const reports = input.reconciliationReports || [];
  const bundles = input.canaryValidationBundles || [];
  const notes = Array.isArray(input.notes) ? input.notes : [];

  if (reports.length === 0 && bundles.length === 0) {
    return createFailedAssessment("No reconciliation reports or canary validation bundles provided.");
  }

  const assessment = {
    success: true,
    valid: true,
    overallStatus: "ready-for-backfill-design",
    requiredTargetTypes,
    evidenceByTargetType: {},
    totals: {
      reconciliationReportCount: reports.length,
      canaryValidationBundleCount: bundles.length,
      reconciliationTargetCount: 0,
      reconciliationEqualCount: 0,
      reconciliationDifferentCount: 0,
      reconciliationMissingSummaryCount: 0,
      reconciliationErrorCount: 0,
      canarySelectedCount: 0,
      canaryValidatedCount: 0,
      canaryFailedCount: 0
    },
    blockers: [],
    warnings: [],
    notes,
    written: false
  };

  for (const type of requiredTargetTypes) {
    assessment.evidenceByTargetType[type] = {
      hasEvidence: false,
      reconciliationEqualCount: 0,
      canaryPassCount: 0
    };
  }

  // Process Reconciliation Reports
  let reportsValid = true;
  for (const rawReport of reports) {
    let report;
    try {
      if (rawReport && typeof rawReport === 'object' && 'computedCounts' in rawReport && 'overallStatus' in rawReport) {
        report = rawReport; // assume already normalized
      } else {
        report = buildProjectionReconciliationReport(rawReport);
      }
    } catch (e) {
      assessment.blockers.push({ code: 'invalid-reconciliation-report', message: `Failed to parse reconciliation report: ${e.message}` });
      reportsValid = false;
      continue;
    }

    if (report.countMismatch === true) {
      assessment.blockers.push({ code: 'reconciliation-count-mismatch', message: 'A reconciliation report has countMismatch === true.' });
      reportsValid = false;
    }

    if (report.overallStatus === 'fail') {
      assessment.blockers.push({ code: 'reconciliation-fail', message: 'A reconciliation report has overallStatus === "fail".' });
      reportsValid = false;
    }

    // Different, missing-summary, error are blockers in top-level evidence
    for(const target of (report.targets || [])) {
        if(target.status === 'different') {
           assessment.blockers.push({ code: 'reconciliation-different', message: `Reconciliation report includes "different" target: ${target.targetType} ${target.targetId}` });
           reportsValid = false;
        } else if (target.status === 'missing-summary') {
           assessment.blockers.push({ code: 'reconciliation-missing-summary', message: `Reconciliation report includes "missing-summary" target: ${target.targetType} ${target.targetId}` });
           reportsValid = false;
        } else if (target.status === 'error') {
           assessment.blockers.push({ code: 'reconciliation-error', message: `Reconciliation report includes "error" target: ${target.targetType} ${target.targetId}` });
           reportsValid = false;
        }

        if (target.status === 'equal') {
            const ev = assessment.evidenceByTargetType[target.targetType];
            if (ev) {
                ev.hasEvidence = true;
                ev.reconciliationEqualCount++;
            }
        }
    }

    assessment.totals.reconciliationTargetCount += report.totalTargets || 0;
    if(report.computedCounts) {
       assessment.totals.reconciliationEqualCount += report.computedCounts.equal || 0;
       assessment.totals.reconciliationDifferentCount += report.computedCounts.different || 0;
       assessment.totals.reconciliationMissingSummaryCount += report.computedCounts.missingSummary || 0;
       assessment.totals.reconciliationErrorCount += report.computedCounts.errors || 0;
    }
  }

  if (!reportsValid) {
    assessment.overallStatus = 'fail';
    assessment.success = false;
    assessment.valid = false;
  }

  // Process Canary Validation Bundles
  let passingCanaryFound = false;
  let bundlesValid = true;

  for (const bundle of bundles) {
    if (!bundle || typeof bundle !== 'object') {
      assessment.blockers.push({ code: 'invalid-canary-bundle', message: 'Canary validation bundle is invalid/null.' });
      bundlesValid = false;
      continue;
    }

    if (bundle.valid !== true) {
      assessment.blockers.push({ code: 'canary-bundle-invalid', message: 'A canary validation bundle has valid !== true.' });
      bundlesValid = false;
    }

    if (bundle.overallStatus === 'fail') {
      assessment.blockers.push({ code: 'canary-bundle-fail', message: 'A canary validation bundle has overallStatus === "fail".' });
      bundlesValid = false;
    }

    if (bundle.overallStatus === 'empty') {
      assessment.warnings.push({ code: 'empty-canary-bundle', message: 'An empty canary validation bundle was provided.' });
    } else if (bundle.overallStatus === 'pass') {
      passingCanaryFound = true;
    }

    for (const target of (bundle.selectedTargets || [])) {
        if (target.postWriteStatus === 'equal') {
            const ev = assessment.evidenceByTargetType[target.targetType];
            if (ev) {
                ev.hasEvidence = true;
                ev.canaryPassCount++;
            }
        }
    }

    assessment.totals.canarySelectedCount += bundle.selectedCount || 0;
    assessment.totals.canaryValidatedCount += bundle.validatedCount || 0;
    assessment.totals.canaryFailedCount += bundle.failedCount || 0;
  }

  if (!bundlesValid) {
    assessment.overallStatus = 'fail';
    assessment.success = false;
    assessment.valid = false;
  }

  if (assessment.overallStatus !== 'fail') {
    if (bundles.length === 0 && !allowEmptyCanaryEvidence) {
      assessment.blockers.push({ code: 'no-canary-bundles', message: 'No canary validation bundles provided and allowEmptyCanaryEvidence is false.' });
      assessment.overallStatus = 'blocked';
    } else if (bundles.length === 0 && allowEmptyCanaryEvidence) {
      assessment.warnings.push({ code: 'no-canary-evidence', message: 'No canary evidence provided, but allowEmptyCanaryEvidence is true.' });
    } else if (!passingCanaryFound && requirePassingCanary && bundles.length > 0) {
      // If we allow empty canary evidence, we only fail if a non-empty canary fails to pass.
      // But if there's a bundle and it's empty, should we fail? Let's check passingCanaryFound OR allowEmptyCanaryEvidence if all bundles are empty.
      const allBundlesEmpty = bundles.every(b => b.overallStatus === 'empty');
      if (allBundlesEmpty && allowEmptyCanaryEvidence) {
        assessment.warnings.push({ code: 'no-canary-evidence', message: 'Canary bundles provided but all are empty, allowEmptyCanaryEvidence is true.' });
      } else {
        assessment.blockers.push({ code: 'no-passing-canary', message: 'Require at least one passing canary validation bundle, but none found.' });
        assessment.overallStatus = 'blocked';
      }
    }
  }

  if (assessment.overallStatus !== 'fail') {
    for (const type of requiredTargetTypes) {
      const ev = assessment.evidenceByTargetType[type];
      if (!ev || !ev.hasEvidence) {
        assessment.blockers.push({ code: 'missing-target-type-evidence', message: `Missing clean evidence for target type: ${type}` });
        assessment.overallStatus = 'blocked';
      }
    }
  }

  assessment.warnings.push({
    code: 'not-execution-ready',
    message: 'This assessment only gates backfill design, not backfill execution or UI read switching.'
  });

  return assessment;
}

function createFailedAssessment(message) {
  return {
    success: false,
    valid: false,
    overallStatus: "fail",
    requiredTargetTypes: ["object", "marker", "place"],
    evidenceByTargetType: {},
    totals: {
      reconciliationReportCount: 0,
      canaryValidationBundleCount: 0,
      reconciliationTargetCount: 0,
      reconciliationEqualCount: 0,
      reconciliationDifferentCount: 0,
      reconciliationMissingSummaryCount: 0,
      reconciliationErrorCount: 0,
      canarySelectedCount: 0,
      canaryValidatedCount: 0,
      canaryFailedCount: 0
    },
    blockers: [
      { code: 'invalid-input', message }
    ],
    warnings: [],
    notes: [],
    written: false
  };
}

/**
 * Formats a projection backfill readiness assessment.
 * @param {object} assessment
 * @param {object} options
 * @param {boolean} [options.json=false]
 * @returns {string}
 */
export function formatProjectionBackfillReadinessAssessment(assessment, options = {}) {
  if (options.json) {
    return JSON.stringify(assessment, null, 2);
  }

  const lines = [
    `Assessment Status: ${assessment.overallStatus.toUpperCase()} (Valid: ${assessment.valid})`,
    `Required Target Types: ${assessment.requiredTargetTypes.join(', ')}`
  ];

  if (assessment.notes && assessment.notes.length > 0) {
    lines.push('');
    lines.push('--- NOTES ---');
    for (const note of assessment.notes) {
      lines.push(`- ${note}`);
    }
  }

  lines.push('');
  lines.push('--- TOTALS ---');
  lines.push(`Reconciliation Reports: ${assessment.totals.reconciliationReportCount}`);
  lines.push(`Reconciliation Targets: ${assessment.totals.reconciliationTargetCount} (Equal: ${assessment.totals.reconciliationEqualCount}, Diff: ${assessment.totals.reconciliationDifferentCount}, Missing: ${assessment.totals.reconciliationMissingSummaryCount}, Error: ${assessment.totals.reconciliationErrorCount})`);
  lines.push(`Canary Validation Bundles: ${assessment.totals.canaryValidationBundleCount}`);
  lines.push(`Canary Targets Selected: ${assessment.totals.canarySelectedCount} (Validated: ${assessment.totals.canaryValidatedCount}, Failed: ${assessment.totals.canaryFailedCount})`);

  lines.push('');
  lines.push('--- EVIDENCE BY TARGET TYPE ---');
  for (const type of assessment.requiredTargetTypes) {
    const ev = assessment.evidenceByTargetType[type];
    if (ev) {
      lines.push(`- ${type}: Has Evidence: ${ev.hasEvidence}, Reconciliation Equal: ${ev.reconciliationEqualCount}, Canary Pass: ${ev.canaryPassCount}`);
    } else {
      lines.push(`- ${type}: Not tracked.`);
    }
  }

  if (assessment.blockers && assessment.blockers.length > 0) {
    lines.push('');
    lines.push('--- BLOCKERS ---');
    for (const blocker of assessment.blockers) {
      lines.push(`- [${blocker.code}] ${blocker.message}`);
    }
  }

  if (assessment.warnings && assessment.warnings.length > 0) {
    lines.push('');
    lines.push('--- WARNINGS ---');
    for (const warning of assessment.warnings) {
      lines.push(`- [${warning.code}] ${warning.message}`);
    }
  }

  lines.push('');
  lines.push('*** SAFETY NOTE ***');
  lines.push('- This tool is purely local and does not call Firebase or write to Firestore.');
  lines.push('- Validates saved JSON evidence only.');
  lines.push('- Pass does NOT authorize backfill execution.');
  lines.push('- Pass does NOT authorize UI read switching.');

  return lines.join('\n');
}
