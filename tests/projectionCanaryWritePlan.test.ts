import { describe, it, expect } from 'vitest';
import { buildProjectionCanaryWritePlan, formatProjectionCanaryWritePlan } from '../scripts/lib/projection-canary-write-plan.mjs';

describe('buildProjectionCanaryWritePlan', () => {
  const baseTarget = {
    targetType: 'object',
    targetId: 'obj-1',
    summaryPath: 'objectSummaries/obj-1'
  };

  const baseReportCounts = {
    totalTargets: 1,
    equalCount: 1,
    differentCount: 0,
    missingSummaryCount: 0,
    errorCount: 0
  };

  it('1. accepts raw callable `{ result: ... }` envelope', () => {
    const input = {
      result: {
        success: true,
        ...baseReportCounts,
        results: [
          { ...baseTarget, success: true, reconciliation: { equal: true } }
        ]
      }
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(true);
    expect(plan.selectedCount).toBe(1);
    expect(plan.selectedTargets[0].targetId).toBe('obj-1');
  });

  it('2. accepts direct reconciliation result object', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(true);
    expect(plan.selectedCount).toBe(1);
    expect(plan.selectedTargets[0].targetId).toBe('obj-1');
  });

  it('3. accepts normalized report object', () => {
    const input = {
      success: true,
      computedCounts: {
        equal: 1,
        different: 0,
        missingSummary: 0,
        errors: 0
      },
      targets: [
        { ...baseTarget, status: 'equal' }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(true);
    expect(plan.selectedCount).toBe(1);
    expect(plan.selectedTargets[0].targetId).toBe('obj-1');
  });

  it('4. selects equal targets by default', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.selectedTargets[0].sourceStatus).toBe('equal');
  });

  it('5. does not select missing-summary by default', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      equalCount: 0,
      missingSummaryCount: 1,
      results: [
        { ...baseTarget, success: true, existingSummaryExists: false }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('missing-summary-not-allowed');
  });

  it('6. selects missing-summary when allowMissingSummary=true', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      equalCount: 0,
      missingSummaryCount: 1,
      results: [
        { ...baseTarget, success: true, existingSummaryExists: false }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input, { allowMissingSummary: true });
    expect(plan.selectedCount).toBe(1);
    expect(plan.selectedTargets[0].sourceStatus).toBe('missing-summary');
  });

  it('7. never selects different targets', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      equalCount: 0,
      differentCount: 1,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: false } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input, { allowMissingSummary: true });
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('different-targets-are-not-selectable');
    expect(plan.warnings).toContain('Input contains targets with "different" status. These are not safe for canary writes and will be skipped.');
  });

  it('8. never selects error targets', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      equalCount: 0,
      errorCount: 1,
      results: [
        { ...baseTarget, success: false, error: { message: 'boom' } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('error-targets-are-not-selectable');
    expect(plan.warnings).toContain('Input contains targets with "error" status. These will be skipped.');
  });

  it('9. respects maxTargets', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      totalTargets: 3,
      equalCount: 3,
      results: [
        { targetType: 'object', targetId: '1', summaryPath: 'p/1', success: true, reconciliation: { equal: true } },
        { targetType: 'object', targetId: '2', summaryPath: 'p/2', success: true, reconciliation: { equal: true } },
        { targetType: 'object', targetId: '3', summaryPath: 'p/3', success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input, { maxTargets: 2 });
    expect(plan.selectedCount).toBe(2);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('max-targets-reached');
    expect(plan.selectedTargets.map(t => t.targetId)).toEqual(['1', '2']);
  });

  it('10. rejects maxTargets less than 1', () => {
    const plan = buildProjectionCanaryWritePlan({}, { maxTargets: 0 });
    expect(plan.valid).toBe(false);
    expect(plan.errors[0].message).toMatch(/maxTargets must be between 1 and 5/);
  });

  it('11. rejects maxTargets greater than 5', () => {
    const plan = buildProjectionCanaryWritePlan({}, { maxTargets: 6 });
    expect(plan.valid).toBe(false);
    expect(plan.errors[0].message).toMatch(/maxTargets must be between 1 and 5/);
  });

  it('12. detects duplicate `{ targetType, targetId }`', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      totalTargets: 2,
      equalCount: 2,
      results: [
        { targetType: 'object', targetId: '1', summaryPath: 'p/1', success: true, reconciliation: { equal: true } },
        { targetType: 'object', targetId: '1', summaryPath: 'p/1', success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(false);
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(0);
    expect(plan.errors[0].code).toBe('duplicate-target');
  });

  it('13. generates `recomputeProjectionSummary` payloads with `dryRun:false`', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.selectedTargets[0].recomputePayload).toEqual({
      data: {
        targetType: 'object',
        targetId: 'obj-1',
        dryRun: false
      }
    });
  });

  it('14. generates post-write `reconcileProjectionSummaries` payload for selected targets', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      totalTargets: 2,
      equalCount: 2,
      results: [
        { targetType: 'object', targetId: '1', summaryPath: 'p/1', success: true, reconciliation: { equal: true } },
        { targetType: 'object', targetId: '2', summaryPath: 'p/2', success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.postWriteReconciliationPayload).toEqual({
      data: {
        includeSummaries: false,
        targets: [
          { targetType: 'object', targetId: '1' },
          { targetType: 'object', targetId: '2' }
        ]
      }
    });
  });

  it('15. returns empty plan when no targets are selectable', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      equalCount: 0,
      differentCount: 1,
      results: [
        { targetType: 'object', targetId: '1', summaryPath: 'p/1', success: true, reconciliation: { equal: false } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(true);
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.selectedTargets).toEqual([]);
    expect(plan.postWriteReconciliationPayload.data.targets).toEqual([]);
  });

  it('16. formats readable output containing selected target ids and safety note', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    const output = formatProjectionCanaryWritePlan(plan);
    expect(output).toMatch(/VALID/);
    expect(output).toMatch(/Selected count: 1 \/ 5 max/);
    expect(output).toMatch(/obj-1/);
    expect(output).toMatch(/\*\*\* SAFETY NOTE \*\*\*/);
    expect(output).toMatch(/"dryRun": false/);
  });

  it('17. JSON formatter returns parseable JSON', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    const output = formatProjectionCanaryWritePlan(plan, { json: true });
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(true);
    expect(parsed.selectedCount).toBe(1);
  });

  it('fails gracefully on invalid input missing properties from normalized parsing', () => {
    const plan = buildProjectionCanaryWritePlan(null);
    expect(plan.valid).toBe(false);
    expect(plan.errors[0].code).toBe('invalid-input');
  });

  it('fails cleanly when countMismatch is true', () => {
    const input = {
      success: true,
      countMismatch: true,
      computedCounts: {
        equal: 1,
        different: 0,
        missingSummary: 0,
        errors: 0
      },
      targets: [
        { ...baseTarget, status: 'equal' }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(false);
    expect(plan.errors[0].code).toBe('invalid-report');
    expect(plan.errors[0].message).toMatch(/internally inconsistent/);
  });

  it('returns correctly zeroed skipped items when equal is false and no matching', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { ...baseTarget, success: true, reconciliation: { equal: true } }
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input, { includeEqual: false });
    expect(plan.selectedCount).toBe(0);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('equal-targets-not-included');
  });

  it('skips items without full keys but maintains validity', () => {
    const input = {
      success: true,
      ...baseReportCounts,
      results: [
        { targetType: 'object', success: true, reconciliation: { equal: true } } // missing targetId and path
      ]
    };
    const plan = buildProjectionCanaryWritePlan(input);
    expect(plan.valid).toBe(true);
    expect(plan.skippedCount).toBe(1);
    expect(plan.skippedTargets[0].reason).toBe('missing-required-fields');
  });
});
