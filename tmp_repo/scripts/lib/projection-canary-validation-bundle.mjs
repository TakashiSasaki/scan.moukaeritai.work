import { buildProjectionReconciliationReport } from './projection-reconciliation-report.mjs';

/**
 * @typedef {Object} ValidationInput
 * @property {any} plan - The canary write plan.
 * @property {any} postWrite - The post-write reconciliation response or report.
 * @property {any} [preWrite] - The optional pre-write reconciliation response or report.
 */

/**
 * Builds a projection canary validation bundle.
 * @param {ValidationInput} input
 * @param {any} [options={}]
 * @returns {any}
 */
export function buildProjectionCanaryValidationBundle(input, options = {}) {
  const bundle = {
    success: true,
    valid: true,
    overallStatus: 'pass',
    selectedCount: 0,
    validatedCount: 0,
    failedCount: 0,
    missingPostWriteTargetCount: 0,
    extraPostWriteTargetCount: 0,
    warnings: [],
    errors: [],
    selectedTargets: [],
    failedTargets: [],
    missingPostWriteTargets: [],
    extraPostWriteTargets: [],
    postWriteSummary: null,
    written: false,
  };

  if (!input || !input.plan || !input.postWrite) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-input', message: 'Input must contain plan and postWrite.' });
    return bundle;
  }

  const { plan, postWrite, preWrite } = input;

  // 1. Validate plan shape
  if (plan.valid !== true) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-plan', message: 'plan.valid must be true.' });
    return bundle;
  }
  if (plan.written !== false) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-plan', message: 'plan.written must be false.' });
    return bundle;
  }
  if (!Array.isArray(plan.selectedTargets)) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-plan', message: 'plan.selectedTargets must be an array.' });
    return bundle;
  }
  if (plan.selectedCount !== plan.selectedTargets.length) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-plan', message: 'plan.selectedCount must equal plan.selectedTargets.length.' });
    return bundle;
  }

  if (plan.selectedCount === 0) {
    bundle.overallStatus = 'empty';
    // Return early for empty plan as there is nothing to validate against postWrite
    return bundle;
  }

  bundle.selectedCount = plan.selectedCount;

  const planTargetsMap = new Map();
  for (const target of plan.selectedTargets) {
    if (!target.targetType || !target.targetId || !target.summaryPath) {
      bundle.success = false;
      bundle.valid = false;
      bundle.overallStatus = 'fail';
      bundle.errors.push({ code: 'invalid-plan-target', message: 'Every selected target must have targetType, targetId, and summaryPath.' });
      return bundle;
    }
    if (!target.recomputePayload || !target.recomputePayload.data || target.recomputePayload.data.dryRun !== false) {
      bundle.success = false;
      bundle.valid = false;
      bundle.overallStatus = 'fail';
      bundle.errors.push({ code: 'invalid-plan-target', message: 'Every selected target must have recomputePayload.data.dryRun === false.' });
      return bundle;
    }
    if (target.recomputePayload.data.targetType !== target.targetType || target.recomputePayload.data.targetId !== target.targetId) {
      bundle.success = false;
      bundle.valid = false;
      bundle.overallStatus = 'fail';
      bundle.errors.push({ code: 'invalid-plan-target', message: `Target identity mismatch in recomputePayload for ${target.targetType} ${target.targetId}.` });
      return bundle;
    }
    const key = `${target.targetType}:${target.targetId}`;
    if (planTargetsMap.has(key)) {
      bundle.success = false;
      bundle.valid = false;
      bundle.overallStatus = 'fail';
      bundle.errors.push({ code: 'invalid-plan-target', message: `Duplicate selected target key: ${key}` });
      return bundle;
    }
    planTargetsMap.set(key, target);
  }

  // 2. Normalize preWrite if present
  if (preWrite) {
    try {
      let pwReport = preWrite;
      if (!pwReport.computedCounts || !Array.isArray(pwReport.targets)) {
        pwReport = buildProjectionReconciliationReport(preWrite);
      }
      bundle.preWriteSummary = {
        provided: true,
        overallStatus: pwReport.overallStatus,
        equalCount: pwReport.computedCounts.equal,
        differentCount: pwReport.computedCounts.different,
        missingSummaryCount: pwReport.computedCounts.missingSummary,
        errorCount: pwReport.computedCounts.errors,
      };
    } catch (e) {
      bundle.warnings.push(`Could not process preWrite: ${e.message}`);
    }
  }

  // 3. Normalize postWrite
  let pwReport;
  try {
    if (postWrite && postWrite.computedCounts && Array.isArray(postWrite.targets)) {
      pwReport = postWrite;
    } else {
      pwReport = buildProjectionReconciliationReport(postWrite);
    }
  } catch (error) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-post-write', message: error.message });
    return bundle;
  }

  if (pwReport.countMismatch === true) {
    bundle.success = false;
    bundle.valid = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'invalid-post-write', message: 'Post-write report has countMismatch = true.' });
    return bundle;
  }

  bundle.postWriteSummary = {
    overallStatus: pwReport.overallStatus,
    equalCount: pwReport.computedCounts.equal,
    differentCount: pwReport.computedCounts.different,
    missingSummaryCount: pwReport.computedCounts.missingSummary,
    errorCount: pwReport.computedCounts.errors,
  };

  const pwTargetsMap = new Map();
  for (const t of pwReport.targets) {
    const key = `${t.targetType}:${t.targetId}`;
    if (pwTargetsMap.has(key)) {
      bundle.success = false;
      bundle.valid = false;
      bundle.overallStatus = 'fail';
      bundle.errors.push({ code: 'invalid-post-write', message: `Duplicate target in post-write report: ${key}` });
      return bundle;
    }
    pwTargetsMap.set(key, t);
  }

  // 4. Validate targets
  for (const [key, planTarget] of planTargetsMap.entries()) {
    const pwTarget = pwTargetsMap.get(key);
    if (!pwTarget) {
      bundle.missingPostWriteTargets.push(planTarget);
      bundle.missingPostWriteTargetCount++;
      bundle.failedTargets.push({ ...planTarget, validationReason: 'missing-in-post-write' });
      bundle.failedCount++;
      continue;
    }

    const valTarget = {
      targetType: planTarget.targetType,
      targetId: planTarget.targetId,
      summaryPath: planTarget.summaryPath,
      sourceStatus: planTarget.sourceStatus,
      postWriteStatus: pwTarget.status,
      postWriteDifferenceCount: pwTarget.differenceCount || 0
    };

    bundle.selectedTargets.push(valTarget);

    if (pwTarget.status !== 'equal') {
      bundle.failedTargets.push({ ...valTarget, validationReason: `post-write-status-is-${pwTarget.status}` });
      bundle.failedCount++;
    } else {
      bundle.validatedCount++;
    }

    pwTargetsMap.delete(key);
  }

  for (const [key, pwTarget] of pwTargetsMap.entries()) {
    bundle.extraPostWriteTargets.push(pwTarget);
    bundle.extraPostWriteTargetCount++;
  }

  if (bundle.missingPostWriteTargetCount > 0) {
    bundle.success = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'missing-post-write-targets', message: `Missing ${bundle.missingPostWriteTargetCount} selected targets in post-write report.` });
  }

  if (bundle.extraPostWriteTargetCount > 0) {
    bundle.success = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'extra-post-write-targets', message: `Found ${bundle.extraPostWriteTargetCount} extra targets in post-write report.` });
  }

  if (bundle.failedCount > 0) {
    bundle.success = false;
    bundle.overallStatus = 'fail';
    bundle.errors.push({ code: 'failed-targets', message: `${bundle.failedCount} selected targets failed validation.` });
  }

  return bundle;
}

/**
 * Formats a canary validation bundle for output.
 * @param {any} bundle
 * @param {{ json?: boolean }} options
 * @returns {string}
 */
export function formatProjectionCanaryValidationBundle(bundle, options = {}) {
  if (options.json) {
    return JSON.stringify(bundle, null, 2);
  }

  const lines = [
    `Canary Validation Status: ${bundle.overallStatus.toUpperCase()} (Valid: ${bundle.valid})`
  ];

  if (!bundle.valid && bundle.errors.length > 0) {
    lines.push('');
    lines.push('ERRORS:');
    for (const err of bundle.errors) {
      lines.push(`- [${err.code}] ${err.message}`);
    }
  }

  lines.push(`Selected count: ${bundle.selectedCount}`);
  if (bundle.overallStatus !== 'empty') {
    lines.push(`Validated count: ${bundle.validatedCount}`);
    lines.push(`Failed count: ${bundle.failedCount}`);
    lines.push(`Missing post-write targets: ${bundle.missingPostWriteTargetCount}`);
    lines.push(`Extra post-write targets: ${bundle.extraPostWriteTargetCount}`);
  }

  if (bundle.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const warn of bundle.warnings) {
      lines.push(`- ${warn}`);
    }
  }

  if (bundle.preWriteSummary) {
    lines.push('');
    lines.push('--- PRE-WRITE SUMMARY ---');
    lines.push(`Overall Status: ${bundle.preWriteSummary.overallStatus}`);
    lines.push(`Equal: ${bundle.preWriteSummary.equalCount}, Different: ${bundle.preWriteSummary.differentCount}, Missing: ${bundle.preWriteSummary.missingSummaryCount}, Error: ${bundle.preWriteSummary.errorCount}`);
  }

  if (bundle.postWriteSummary) {
    lines.push('');
    lines.push('--- POST-WRITE SUMMARY ---');
    lines.push(`Overall Status: ${bundle.postWriteSummary.overallStatus}`);
    lines.push(`Equal: ${bundle.postWriteSummary.equalCount}, Different: ${bundle.postWriteSummary.differentCount}, Missing: ${bundle.postWriteSummary.missingSummaryCount}, Error: ${bundle.postWriteSummary.errorCount}`);
  }

  if (bundle.selectedTargets.length > 0) {
    lines.push('');
    lines.push('--- VALIDATED TARGETS ---');
    for (const t of bundle.selectedTargets) {
      lines.push(`\nTarget: ${t.targetType} ${t.targetId}`);
      lines.push(`  Source Status: ${t.sourceStatus}`);
      lines.push(`  Post-Write Status: ${t.postWriteStatus}`);
      if (t.postWriteDifferenceCount > 0) {
        lines.push(`  Post-Write Differences: ${t.postWriteDifferenceCount}`);
      }
    }
  }

  if (bundle.failedTargets.length > 0) {
    lines.push('');
    lines.push('--- FAILED TARGETS ---');
    for (const t of bundle.failedTargets) {
      lines.push(`Target: ${t.targetType} ${t.targetId} - ${t.validationReason}`);
    }
  }

  if (bundle.missingPostWriteTargets.length > 0) {
    lines.push('');
    lines.push('--- MISSING POST-WRITE TARGETS ---');
    for (const t of bundle.missingPostWriteTargets) {
      lines.push(`Target: ${t.targetType} ${t.targetId}`);
    }
  }

  if (bundle.extraPostWriteTargets.length > 0) {
    lines.push('');
    lines.push('--- EXTRA POST-WRITE TARGETS ---');
    for (const t of bundle.extraPostWriteTargets) {
      lines.push(`Target: ${t.targetType} ${t.targetId}`);
    }
  }

  lines.push('');
  lines.push('*** SAFETY NOTE ***');
  lines.push('- This tool is purely local and does not call Firebase or write to Firestore.');
  lines.push('- Validates saved JSON evidence only.');
  lines.push('- Pass does NOT authorize broad backfill.');
  lines.push('- Pass does NOT authorize UI read switching.');

  return lines.join('\n');
}
