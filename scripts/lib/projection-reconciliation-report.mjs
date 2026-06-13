/**
 * Helper for building and formatting projection reconciliation reports.
 * This is a pure helper and does not depend on Firebase or specific environments.
 */

/**
 * Normalizes a callable HTTP response envelope or a direct result object into a direct result object.
 * @param {any} input
 * @returns {any}
 */
export function parseCallableResultEnvelope(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be a non-null object');
  }

  // Handle Firebase Callable HTTP response envelope `{ result: { ... } }`
  if ('result' in input && input.result && typeof input.result === 'object') {
    return input.result;
  }

  // Assume it's a direct result object
  return input;
}

/**
 * Builds a normalized projection reconciliation report from a result object.
 * @param {any} rawInput
 * @returns {any}
 */
export function buildProjectionReconciliationReport(rawInput) {
  const result = parseCallableResultEnvelope(rawInput);

  if (typeof result.success !== 'boolean') {
    throw new Error('Invalid result object: missing or invalid "success" field');
  }

  if (!Array.isArray(result.results)) {
    throw new Error('Invalid result object: missing or invalid "results" array');
  }

  const report = {
    success: result.success,
    written: Boolean(result.written),
    includeSummaries: Boolean(result.includeSummaries),
    totalTargets: typeof result.totalTargets === 'number' ? result.totalTargets : 0,
    equalCount: typeof result.equalCount === 'number' ? result.equalCount : 0,
    differentCount: typeof result.differentCount === 'number' ? result.differentCount : 0,
    missingSummaryCount: typeof result.missingSummaryCount === 'number' ? result.missingSummaryCount : 0,
    errorCount: typeof result.errorCount === 'number' ? result.errorCount : 0,
    computedCounts: {
      equal: 0,
      different: 0,
      missingSummary: 0,
      errors: 0
    },
    countMismatch: false,
    overallStatus: 'pass',
    targets: []
  };

  const results = result.results;

  for (const target of results) {
    let status = 'error';
    if (!target.success) {
      status = 'error';
      report.computedCounts.errors++;
    } else if (target.existingSummaryExists === false) {
      status = 'missing-summary';
      report.computedCounts.missingSummary++;
    } else if (target.reconciliation?.equal === true) {
      status = 'equal';
      report.computedCounts.equal++;
    } else if (target.reconciliation?.equal === false) {
      status = 'different';
      report.computedCounts.different++;
    }

    const rec = target.reconciliation || {};
    const diff = rec.diff || {}; // Fallback for old shapes
    const differenceCount = rec.differenceCount || 0;

    const missingPaths = Array.isArray(rec.missingPaths) ? rec.missingPaths : (Array.isArray(diff.missingPaths) ? diff.missingPaths : []);
    const extraPaths = Array.isArray(rec.extraPaths) ? rec.extraPaths : (Array.isArray(diff.extraPaths) ? diff.extraPaths : []);
    const changedPaths = Array.isArray(rec.changedPaths) ? rec.changedPaths : (Array.isArray(diff.changedPaths) ? diff.changedPaths : []);
    const ignoredPaths = Array.isArray(rec.ignoredPaths) ? rec.ignoredPaths : (Array.isArray(diff.ignoredPaths) ? diff.ignoredPaths : []);

    report.targets.push({
      targetType: target.targetType || 'unknown',
      targetId: target.targetId || 'unknown',
      summaryPath: target.summaryPath || 'unknown',
      status,
      differenceCount,
      missingPaths,
      extraPaths,
      changedPaths,
      ignoredPaths,
      error: target.error || null
    });
  }

  if (
    report.computedCounts.equal !== report.equalCount ||
    report.computedCounts.different !== report.differentCount ||
    report.computedCounts.missingSummary !== report.missingSummaryCount ||
    report.computedCounts.errors !== report.errorCount ||
    results.length !== report.totalTargets
  ) {
    report.countMismatch = true;
  }

  if (report.countMismatch || report.computedCounts.errors > 0 || !report.success) {
    report.overallStatus = 'fail';
  } else if (report.computedCounts.different > 0 || report.computedCounts.missingSummary > 0) {
    report.overallStatus = 'attention';
  } else {
    report.overallStatus = 'pass';
  }

  return report;
}

/**
 * Formats a projection reconciliation report into a human-readable string or JSON string.
 * @param {any} report
 * @param {{ json?: boolean }} options
 * @returns {string}
 */
export function formatProjectionReconciliationReport(report, options = {}) {
  if (options.json) {
    return JSON.stringify(report, null, 2);
  }

  const lines = [
    `Overall status: ${report.overallStatus}`,
    `Total targets: ${report.totalTargets}`,
    `Equal: ${report.equalCount}`,
    `Different: ${report.differentCount}`,
    `Missing summaries: ${report.missingSummaryCount}`,
    `Errors: ${report.errorCount}`
  ];

  if (report.countMismatch) {
    lines.push('');
    lines.push('WARNING: Count mismatch detected between computed counts and reported top-level counts.');
  }

  if (report.targets.length > 0) {
    lines.push('');
    lines.push('Targets:');
    for (const t of report.targets) {
      let targetLine = `- ${t.targetType} ${t.targetId} ${t.summaryPath}: ${t.status}`;
      if (t.status === 'different') {
        targetLine += ` (differenceCount=${t.differenceCount}, changed=${t.changedPaths.length}, missing=${t.missingPaths.length}, extra=${t.extraPaths.length})`;
      } else if (t.status === 'error' && t.error) {
        const errMsg = t.error.message || t.error.code || JSON.stringify(t.error);
        targetLine += ` (error=${errMsg})`;
      }
      lines.push(targetLine);
    }
  }

  return lines.join('\n');
}
