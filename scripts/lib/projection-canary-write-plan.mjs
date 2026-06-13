/**
 * Helper for building projection canary write plans from reconciliation reports.
 * This is a pure helper and does not depend on Firebase or specific environments.
 */

import { buildProjectionReconciliationReport } from './projection-reconciliation-report.mjs';

/**
 * @typedef {Object} CanaryWritePlanOptions
 * @property {number} [maxTargets=5] - Maximum number of targets to select (1..5).
 * @property {boolean} [allowMissingSummary=false] - Whether to allow selection of targets with missing summaries.
 * @property {boolean} [includeEqual=true] - Whether to include equal targets.
 */

/**
 * Builds a projection canary write plan.
 * @param {any} input - Raw callable envelope, direct result object, or normalized report.
 * @param {CanaryWritePlanOptions} [options={}]
 * @returns {any}
 */
export function buildProjectionCanaryWritePlan(input, options = {}) {
  const maxTargets = typeof options.maxTargets === 'number' ? options.maxTargets : 5;
  const allowMissingSummary = options.allowMissingSummary === true;
  const includeEqual = options.includeEqual !== false;

  const plan = {
    success: true,
    valid: true,
    maxTargets,
    allowMissingSummary,
    includeEqual,
    selectedCount: 0,
    skippedCount: 0,
    warnings: [],
    errors: [],
    selectedTargets: [],
    skippedTargets: [],
    postWriteReconciliationPayload: {
      data: {
        includeSummaries: false,
        targets: []
      }
    },
    written: false
  };

  if (maxTargets < 1 || maxTargets > 5) {
    plan.success = false;
    plan.valid = false;
    plan.errors.push({
      code: 'invalid-options',
      message: 'maxTargets must be between 1 and 5'
    });
    return plan;
  }

  let report;
  try {
    // If the input already looks like a normalized report, use it.
    // Otherwise, normalize it.
    if (input && input.computedCounts && Array.isArray(input.targets)) {
      report = input;
    } else {
      report = buildProjectionReconciliationReport(input);
    }
  } catch (error) {
    plan.success = false;
    plan.valid = false;
    plan.errors.push({
      code: 'invalid-input',
      message: error.message
    });
    return plan;
  }

  if (report.countMismatch === true) {
    plan.success = false;
    plan.valid = false;
    plan.errors.push({
      code: 'invalid-report',
      message: 'Input report has countMismatch=true. The reconciliation results are internally inconsistent.'
    });
    return plan;
  }

  if (report.computedCounts && report.computedCounts.different > 0) {
    plan.warnings.push('Input contains targets with "different" status. These are not safe for canary writes and will be skipped.');
  }
  if (report.computedCounts && report.computedCounts.errors > 0) {
    plan.warnings.push('Input contains targets with "error" status. These will be skipped.');
  }

  const seenKeys = new Set();

  // First pass to detect duplicates before selecting anything
  for (const t of report.targets) {
    if (!t.targetType || !t.targetId) continue;
    const key = `${t.targetType}:${t.targetId}`;
    if (seenKeys.has(key)) {
      plan.success = false;
      plan.valid = false;
      plan.errors.push({
        code: 'duplicate-target',
        message: `Duplicate target specified: ${key}`
      });
      // In failure state, clear everything out
      plan.selectedTargets = [];
      plan.skippedTargets = [];
      plan.selectedCount = 0;
      plan.skippedCount = 0;
      plan.postWriteReconciliationPayload.data.targets = [];
      plan.warnings = [];
      return plan;
    }
    seenKeys.add(key);
  }

  for (const target of report.targets) {
    const { targetType, targetId, summaryPath, status } = target;

    // Reject unknown strings that buildProjectionReconciliationReport populates
    if (!targetType || targetType === 'unknown' || !targetId || targetId === 'unknown' || !summaryPath || summaryPath === 'unknown') {
      plan.skippedTargets.push({
        targetType: targetType || 'unknown',
        targetId: targetId || 'unknown',
        summaryPath: summaryPath || 'unknown',
        sourceStatus: status,
        reason: 'missing-required-fields'
      });
      plan.skippedCount++;
      continue;
    }

    if (status === 'error') {
      plan.skippedTargets.push({
        targetType, targetId, summaryPath, sourceStatus: status,
        reason: 'error-targets-are-not-selectable'
      });
      plan.skippedCount++;
      continue;
    }

    if (status === 'different') {
      plan.skippedTargets.push({
        targetType, targetId, summaryPath, sourceStatus: status,
        reason: 'different-targets-are-not-selectable'
      });
      plan.skippedCount++;
      continue;
    }

    if (status === 'missing-summary' && !allowMissingSummary) {
      plan.skippedTargets.push({
        targetType, targetId, summaryPath, sourceStatus: status,
        reason: 'missing-summary-not-allowed'
      });
      plan.skippedCount++;
      continue;
    }

    if (status === 'equal' && !includeEqual) {
      plan.skippedTargets.push({
        targetType, targetId, summaryPath, sourceStatus: status,
        reason: 'equal-targets-not-included'
      });
      plan.skippedCount++;
      continue;
    }

    if (plan.selectedCount >= maxTargets) {
      plan.skippedTargets.push({
        targetType, targetId, summaryPath, sourceStatus: status,
        reason: 'max-targets-reached'
      });
      plan.skippedCount++;
      continue;
    }

    // Target is selectable
    plan.selectedTargets.push({
      targetType,
      targetId,
      summaryPath,
      sourceStatus: status,
      recomputePayload: {
        data: {
          targetType,
          targetId,
          dryRun: false
        }
      }
    });
    plan.selectedCount++;
    plan.postWriteReconciliationPayload.data.targets.push({
      targetType,
      targetId
    });
  }

  return plan;
}

/**
 * Formats a canary write plan for output.
 * @param {any} plan
 * @param {{ json?: boolean }} options
 * @returns {string}
 */
export function formatProjectionCanaryWritePlan(plan, options = {}) {
  if (options.json) {
    return JSON.stringify(plan, null, 2);
  }

  const lines = [
    `Canary Write Plan Status: ${plan.valid ? 'VALID' : 'INVALID'}`
  ];

  if (!plan.valid && plan.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS:');
    for (const err of plan.errors) {
      lines.push(`- [${err.code}] ${err.message}`);
    }
    return lines.join('\n');
  }

  lines.push(`Selected count: ${plan.selectedCount} / ${plan.maxTargets} max`);
  lines.push(`Skipped count: ${plan.skippedCount}`);

  if (plan.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const warn of plan.warnings) {
      lines.push(`- ${warn}`);
    }
  }

  if (plan.selectedCount > 0) {
    lines.push('');
    lines.push('--- SELECTED TARGETS ---');
    for (const t of plan.selectedTargets) {
      lines.push(`\nTarget: ${t.targetType} ${t.targetId} (status: ${t.sourceStatus})`);
      lines.push(`Recompute Payload:`);
      lines.push(JSON.stringify(t.recomputePayload, null, 2));
    }

    lines.push('');
    lines.push('--- POST-WRITE RECONCILIATION VERIFICATION PAYLOAD ---');
    lines.push(JSON.stringify(plan.postWriteReconciliationPayload, null, 2));
  } else {
    lines.push('');
    lines.push('No targets selected for canary writes.');
  }

  lines.push('');
  lines.push('*** SAFETY NOTE ***');
  lines.push('- This tool is purely local and does not call Firebase or write to Firestore.');
  lines.push('- Generated payloads with `dryRun:false` are for explicit manual canary use ONLY.');
  lines.push('- This plan does NOT authorize broad backfill or UI read switching.');

  return lines.join('\n');
}
