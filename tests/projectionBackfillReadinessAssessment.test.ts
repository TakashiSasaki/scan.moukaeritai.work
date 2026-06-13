import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillReadinessAssessment, formatProjectionBackfillReadinessAssessment } from '../scripts/lib/projection-backfill-readiness-assessment.mjs';

describe('Projection Backfill Readiness Assessment', () => {

  const createValidReport = (targets) => ({
    success: true,
    totalTargets: targets.length,
    computedCounts: {
      equal: targets.filter(t => t.status === 'equal').length,
      different: targets.filter(t => t.status === 'different').length,
      missingSummary: targets.filter(t => t.status === 'missing-summary').length,
      errors: targets.filter(t => t.status === 'error').length,
    },
    countMismatch: false,
    overallStatus: targets.some(t => t.status !== 'equal') ? 'attention' : 'pass',
    targets
  });

  const createValidBundle = (targets) => ({
    success: true,
    valid: true,
    overallStatus: targets.length > 0 ? (targets.some(t => t.postWriteStatus !== 'equal') ? 'fail' : 'pass') : 'empty',
    selectedCount: targets.length,
    validatedCount: targets.filter(t => t.postWriteStatus === 'equal').length,
    failedCount: targets.filter(t => t.postWriteStatus !== 'equal').length,
    selectedTargets: targets,
    errors: [],
    warnings: [],
    preWriteSummary: undefined
  });

  it('1. accepts normalized reconciliation report evidence', () => {
    const report = createValidReport([
      { targetType: 'object', targetId: 'o1', status: 'equal' }
    ]);
    const input = { reconciliationReports: [report], canaryValidationBundles: [] };
    const assessment = buildProjectionBackfillReadinessAssessment(input, { allowEmptyCanaryEvidence: true });

    expect(assessment.valid).toBe(true);
    expect(assessment.totals.reconciliationReportCount).toBe(1);
    expect(assessment.totals.reconciliationTargetCount).toBe(1);
    expect(assessment.evidenceByTargetType.object.hasEvidence).toBe(true);
    // Might be blocked if marker/place missing, but report is accepted
  });

  it('2. accepts raw callable reconciliation response evidence', () => {
    const rawResponse = {
      result: {
        success: true,
        totalTargets: 1,
        equalCount: 1,
        differentCount: 0,
        missingSummaryCount: 0,
        errorCount: 0,
        results: [
          { success: true, targetType: 'object', targetId: 'o1', existingSummaryExists: true, reconciliation: { equal: true } }
        ]
      }
    };
    const input = { reconciliationReports: [rawResponse], canaryValidationBundles: [] };
    const assessment = buildProjectionBackfillReadinessAssessment(input, { allowEmptyCanaryEvidence: true });

    expect(assessment.valid).toBe(true);
    expect(assessment.totals.reconciliationReportCount).toBe(1);
    expect(assessment.evidenceByTargetType.object.hasEvidence).toBe(true);
  });

  it('3. accepts canary validation bundle evidence', () => {
    const bundle = createValidBundle([
      { targetType: 'marker', targetId: 'm1', postWriteStatus: 'equal' }
    ]);
    const input = { reconciliationReports: [], canaryValidationBundles: [bundle] };
    const assessment = buildProjectionBackfillReadinessAssessment(input);

    expect(assessment.valid).toBe(true);
    expect(assessment.totals.canaryValidationBundleCount).toBe(1);
    expect(assessment.evidenceByTargetType.marker.hasEvidence).toBe(true);
  });

  it('4. produces "ready-for-backfill-design" when object/marker/place all have clean evidence and at least one canary validation passes', () => {
    const report = createValidReport([
      { targetType: 'object', targetId: 'o1', status: 'equal' },
      { targetType: 'marker', targetId: 'm1', status: 'equal' }
    ]);
    const bundle = createValidBundle([
      { targetType: 'place', targetId: 'p1', postWriteStatus: 'equal' }
    ]);
    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report],
      canaryValidationBundles: [bundle]
    });

    expect(assessment.overallStatus).toBe('ready-for-backfill-design');
    expect(assessment.valid).toBe(true);
    expect(assessment.blockers.length).toBe(0);
  });

  it('5. produces "blocked" when a required target type lacks evidence', () => {
    const report = createValidReport([
      { targetType: 'object', targetId: 'o1', status: 'equal' }
    ]);
    const bundle = createValidBundle([
      { targetType: 'marker', targetId: 'm1', postWriteStatus: 'equal' }
    ]);
    // place is missing
    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report],
      canaryValidationBundles: [bundle]
    });

    expect(assessment.overallStatus).toBe('blocked');
    expect(assessment.blockers[0].code).toBe('missing-target-type-evidence');
  });

  it('6. fails when a reconciliation report has "countMismatch === true"', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'equal' }]);
    report.countMismatch = true;

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'reconciliation-count-mismatch' }));
  });

  it('7. fails when a reconciliation report has "overallStatus === \\"fail\\""', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'equal' }]);
    report.overallStatus = 'fail';

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'reconciliation-fail' }));
  });

  it('8. blocks or fails when reconciliation targets include "different"', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'different' }]);

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'reconciliation-different' }));
  });

  it('9. blocks or fails when reconciliation targets include "missing-summary"', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'missing-summary' }]);

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'reconciliation-missing-summary' }));
  });

  it('10. blocks or fails when reconciliation targets include "error"', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'error' }]);

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'reconciliation-error' }));
  });

  it('11. fails when a canary validation bundle is invalid', () => {
    const bundle = createValidBundle([{ targetType: 'object', targetId: 'o1', postWriteStatus: 'equal' }]);
    bundle.valid = false;

    const assessment = buildProjectionBackfillReadinessAssessment({
      canaryValidationBundles: [bundle]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'canary-bundle-invalid' }));
  });

  it('12. fails when a canary validation bundle has "overallStatus === \\"fail\\""', () => {
    const bundle = createValidBundle([{ targetType: 'object', targetId: 'o1', postWriteStatus: 'different' }]);
    // createValidBundle already sets overallStatus to fail when postWriteStatus !== equal

    const assessment = buildProjectionBackfillReadinessAssessment({
      canaryValidationBundles: [bundle]
    });

    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'canary-bundle-fail' }));
  });

  it('13. warns but does not fail solely for empty canary bundle when other required evidence exists and "allowEmptyCanaryEvidence=true"', () => {
    const report = createValidReport([
      { targetType: 'object', targetId: 'o1', status: 'equal' },
      { targetType: 'marker', targetId: 'm1', status: 'equal' },
      { targetType: 'place', targetId: 'p1', status: 'equal' }
    ]);
    const bundle = createValidBundle([]); // empty bundle

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report],
      canaryValidationBundles: [bundle]
    }, { allowEmptyCanaryEvidence: true });

    expect(assessment.overallStatus).toBe('ready-for-backfill-design');
    expect(assessment.warnings).toContainEqual(expect.objectContaining({ code: 'empty-canary-bundle' }));
  });

  it('14. blocks when no passing canary exists and "requirePassingCanary=true"', () => {
    const report = createValidReport([
      { targetType: 'object', targetId: 'o1', status: 'equal' },
      { targetType: 'marker', targetId: 'm1', status: 'equal' },
      { targetType: 'place', targetId: 'p1', status: 'equal' }
    ]);
    const bundle = createValidBundle([]); // empty bundle -> not passing

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report],
      canaryValidationBundles: [bundle]
    }, { requirePassingCanary: true });

    expect(assessment.overallStatus).toBe('blocked');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'no-passing-canary' }));
  });

  it('15. uses preWriteSummary as context only and does not fail because preWrite had differences', () => {
    const bundle = createValidBundle([{ targetType: 'object', targetId: 'o1', postWriteStatus: 'equal' }]);
    bundle.preWriteSummary = { overallStatus: 'attention', differentCount: 1 }; // Context only

    const report = createValidReport([
      { targetType: 'marker', targetId: 'm1', status: 'equal' },
      { targetType: 'place', targetId: 'p1', status: 'equal' }
    ]);

    const assessment = buildProjectionBackfillReadinessAssessment({
      reconciliationReports: [report],
      canaryValidationBundles: [bundle]
    });

    expect(assessment.overallStatus).toBe('ready-for-backfill-design');
  });

  it('16. rejects malformed input', () => {
    const assessment = buildProjectionBackfillReadinessAssessment(null);
    expect(assessment.overallStatus).toBe('fail');
    expect(assessment.blockers).toContainEqual(expect.objectContaining({ code: 'invalid-input' }));
  });

  it('17. JSON formatter returns parseable JSON', () => {
    const assessment = buildProjectionBackfillReadinessAssessment({}); // will fail/block but we test formatting
    const jsonStr = formatProjectionBackfillReadinessAssessment(assessment, { json: true });
    expect(() => JSON.parse(jsonStr)).not.toThrow();
    const parsed = JSON.parse(jsonStr);
    expect(parsed.written).toBe(false);
  });

  it('18. readable formatter includes target type evidence and safety note', () => {
    const report = createValidReport([{ targetType: 'object', targetId: 'o1', status: 'equal' }]);
    const assessment = buildProjectionBackfillReadinessAssessment({ reconciliationReports: [report] });
    const output = formatProjectionBackfillReadinessAssessment(assessment, { json: false });

    expect(output).toContain('Has Evidence: true');
    expect(output).toContain('SAFETY NOTE');
    expect(output).toContain('Pass does NOT authorize backfill execution.');
  });
});
