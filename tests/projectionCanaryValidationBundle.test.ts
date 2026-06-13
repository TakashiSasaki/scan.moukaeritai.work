import { describe, it, expect } from 'vitest';
import { buildProjectionCanaryValidationBundle, formatProjectionCanaryValidationBundle } from '../scripts/lib/projection-canary-validation-bundle.mjs';

describe('buildProjectionCanaryValidationBundle', () => {
  const validPlan = {
    valid: true,
    written: false,
    selectedCount: 2,
    selectedTargets: [
      {
        targetType: 'object',
        targetId: 'obj1',
        summaryPath: 'objectSummaries/obj1',
        recomputePayload: { data: { targetType: 'object', targetId: 'obj1', dryRun: false } }
      },
      {
        targetType: 'marker',
        targetId: 'mk1',
        summaryPath: 'markerSummaries/mk1',
        recomputePayload: { data: { targetType: 'marker', targetId: 'mk1', dryRun: false } }
      }
    ]
  };

  const validPostWriteCallableEnvelope = {
    result: {
      success: true,
      totalTargets: 2,
      equalCount: 2,
      differentCount: 0,
      missingSummaryCount: 0,
      errorCount: 0,
      results: [
        { success: true, targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', reconciliation: { equal: true, differenceCount: 0 } },
        { success: true, targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', reconciliation: { equal: true, differenceCount: 0 } }
      ]
    }
  };

  const validPostWriteDirectResult = {
    success: true,
    totalTargets: 2,
    equalCount: 2,
    differentCount: 0,
    missingSummaryCount: 0,
    errorCount: 0,
    results: [
      { success: true, targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', reconciliation: { equal: true, differenceCount: 0 } },
      { success: true, targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', reconciliation: { equal: true, differenceCount: 0 } }
    ]
  };

  const validPostWriteNormalizedReport = {
    overallStatus: 'pass',
    countMismatch: false,
    computedCounts: { equal: 2, different: 0, missingSummary: 0, errors: 0, requested: 2, returned: 2 },
    targets: [
      { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
      { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'equal' }
    ]
  };

  it('1. accepts valid canary plan and post-write callable { result: ... } envelope', () => {
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteCallableEnvelope });
    expect(bundle.success).toBe(true);
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('pass');
    expect(bundle.validatedCount).toBe(2);
  });

  it('2. accepts valid canary plan and direct post-write result object', () => {
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteDirectResult });
    expect(bundle.success).toBe(true);
    expect(bundle.overallStatus).toBe('pass');
    expect(bundle.validatedCount).toBe(2);
  });

  it('3. accepts valid canary plan and normalized post-write report', () => {
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(true);
    expect(bundle.overallStatus).toBe('pass');
    expect(bundle.validatedCount).toBe(2);
  });

  it('4. passes when all selected targets are post-write equal', () => {
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.overallStatus).toBe('pass');
    expect(bundle.failedCount).toBe(0);
    expect(bundle.validatedCount).toBe(2);
  });

  it('5. fails when a selected target is post-write different', () => {
    const postWriteDiff = {
      overallStatus: 'attention',
      countMismatch: false,
      computedCounts: { equal: 1, different: 1, missingSummary: 0, errors: 0, requested: 2, returned: 2 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
        { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'different' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteDiff });
    expect(bundle.success).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.failedCount).toBe(1);
    expect(bundle.failedTargets[0].targetId).toBe('mk1');
    expect(bundle.failedTargets[0].validationReason).toBe('post-write-status-is-different');
  });

  it('6. fails when a selected target is post-write missing-summary', () => {
    const postWriteMissing = {
      overallStatus: 'attention',
      countMismatch: false,
      computedCounts: { equal: 1, different: 0, missingSummary: 1, errors: 0, requested: 2, returned: 2 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
        { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'missing-summary' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteMissing });
    expect(bundle.success).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.failedCount).toBe(1);
    expect(bundle.failedTargets[0].validationReason).toBe('post-write-status-is-missing-summary');
  });

  it('7. fails when a selected target is post-write error', () => {
    const postWriteError = {
      overallStatus: 'fail',
      countMismatch: false,
      computedCounts: { equal: 1, different: 0, missingSummary: 0, errors: 1, requested: 2, returned: 2 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
        { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'error' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteError });
    expect(bundle.success).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.failedCount).toBe(1);
    expect(bundle.failedTargets[0].validationReason).toBe('post-write-status-is-error');
  });

  it('8. fails when post-write report misses a selected target', () => {
    const postWriteMiss = {
      overallStatus: 'attention',
      countMismatch: false,
      computedCounts: { equal: 1, different: 0, missingSummary: 0, errors: 0, requested: 1, returned: 1 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteMiss });
    expect(bundle.success).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.missingPostWriteTargetCount).toBe(1);
    expect(bundle.missingPostWriteTargets[0].targetId).toBe('mk1');
  });

  it('9. fails when post-write report has an extra target', () => {
    const postWriteExtra = {
      overallStatus: 'pass',
      countMismatch: false,
      computedCounts: { equal: 3, different: 0, missingSummary: 0, errors: 0, requested: 3, returned: 3 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
        { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'equal' },
        { targetType: 'place', targetId: 'pl1', summaryPath: 'placeSummaries/pl1', status: 'equal' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteExtra });
    expect(bundle.success).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.extraPostWriteTargetCount).toBe(1);
    expect(bundle.extraPostWriteTargets[0].targetId).toBe('pl1');
  });

  it('10. fails on duplicate selected target keys in the plan', () => {
    const badPlan = {
      valid: true,
      written: false,
      selectedCount: 2,
      selectedTargets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', recomputePayload: { data: { targetType: 'object', targetId: 'obj1', dryRun: false } } },
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', recomputePayload: { data: { targetType: 'object', targetId: 'obj1', dryRun: false } } }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: badPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.errors[0].code).toBe('invalid-plan-target');
    expect(bundle.errors[0].message).toContain('Duplicate selected target key');
  });

  it('11. fails when selected target recompute payload does not have dryRun:false', () => {
    const badPlan = {
      valid: true,
      written: false,
      selectedCount: 1,
      selectedTargets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', recomputePayload: { data: { targetType: 'object', targetId: 'obj1', dryRun: true } } }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: badPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.errors[0].message).toContain('dryRun === false');
  });

  it('fails when recomputePayload.data.targetType differs from selected target targetType', () => {
    const badPlan = {
      valid: true,
      written: false,
      selectedCount: 1,
      selectedTargets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', recomputePayload: { data: { targetType: 'marker', targetId: 'obj1', dryRun: false } } }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: badPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.errors[0].message).toContain('Target identity mismatch');
  });

  it('fails when recomputePayload.data.targetId differs from selected target targetId', () => {
    const badPlan = {
      valid: true,
      written: false,
      selectedCount: 1,
      selectedTargets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', recomputePayload: { data: { targetType: 'object', targetId: 'obj2', dryRun: false } } }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: badPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.errors[0].message).toContain('Target identity mismatch');
  });

  it('passes when recomputePayload.data.targetType, targetId, and dryRun:false all match', () => {
    // This is tested extensively by validPlan, but let's confirm explicitly.
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(true);
    expect(bundle.valid).toBe(true);
  });

  it('12. fails when plan.valid !== true', () => {
    const badPlan = { ...validPlan, valid: false };
    const bundle = buildProjectionCanaryValidationBundle({ plan: badPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.errors[0].message).toContain('plan.valid must be true');
  });

  it('13. returns overallStatus:"empty" for a valid empty plan', () => {
    const emptyPlan = { valid: true, written: false, selectedCount: 0, selectedTargets: [] };
    const bundle = buildProjectionCanaryValidationBundle({ plan: emptyPlan, postWrite: validPostWriteNormalizedReport });
    expect(bundle.success).toBe(true);
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('empty');
  });

  it('15. rejects post-write report with countMismatch === true', () => {
    const postWriteMismatch = {
      overallStatus: 'fail',
      countMismatch: true,
      computedCounts: { equal: 2, different: 0, missingSummary: 0, errors: 0, requested: 2, returned: 1 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: postWriteMismatch });
    expect(bundle.success).toBe(false);
    expect(bundle.valid).toBe(false);
    expect(bundle.errors[0].message).toContain('countMismatch = true');
  });

  it('16. includes pre-write summary when preWrite is provided', () => {
    const preWrite = {
      overallStatus: 'attention',
      countMismatch: false,
      computedCounts: { equal: 1, different: 1, missingSummary: 0, errors: 0, requested: 2, returned: 2 },
      targets: [
        { targetType: 'object', targetId: 'obj1', summaryPath: 'objectSummaries/obj1', status: 'equal' },
        { targetType: 'marker', targetId: 'mk1', summaryPath: 'markerSummaries/mk1', status: 'different' }
      ]
    };
    const bundle = buildProjectionCanaryValidationBundle({ plan: validPlan, postWrite: validPostWriteNormalizedReport, preWrite });
    expect(bundle.preWriteSummary.provided).toBe(true);
    expect(bundle.preWriteSummary.overallStatus).toBe('attention');
    expect(bundle.preWriteSummary.equalCount).toBe(1);
    expect(bundle.preWriteSummary.differentCount).toBe(1);
  });
});

describe('formatProjectionCanaryValidationBundle', () => {
  const bundle = {
    success: true,
    valid: true,
    overallStatus: 'pass',
    selectedCount: 1,
    validatedCount: 1,
    failedCount: 0,
    missingPostWriteTargetCount: 0,
    extraPostWriteTargetCount: 0,
    warnings: [],
    errors: [],
    selectedTargets: [
      { targetType: 'object', targetId: 'obj1', sourceStatus: 'different', postWriteStatus: 'equal', postWriteDifferenceCount: 0 }
    ],
    failedTargets: [],
    missingPostWriteTargets: [],
    extraPostWriteTargets: [],
    postWriteSummary: { overallStatus: 'pass', equalCount: 1, differentCount: 0, missingSummaryCount: 0, errorCount: 0 },
    written: false
  };

  it('17. JSON formatter returns parseable JSON', () => {
    const jsonStr = formatProjectionCanaryValidationBundle(bundle, { json: true });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.overallStatus).toBe('pass');
    expect(parsed.selectedCount).toBe(1);
  });

  it('18. readable formatter includes selected target ids and safety note', () => {
    const text = formatProjectionCanaryValidationBundle(bundle, { json: false });
    expect(text).toContain('Canary Validation Status: PASS');
    expect(text).toContain('Target: object obj1');
    expect(text).toContain('*** SAFETY NOTE ***');
    expect(text).toContain('Pass does NOT authorize broad backfill.');
    expect(text).toContain('Pass does NOT authorize UI read switching.');
  });
});
