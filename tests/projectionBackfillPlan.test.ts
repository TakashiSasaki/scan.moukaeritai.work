import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillPlan, formatProjectionBackfillPlan } from '../scripts/lib/projection-backfill-plan.mjs';

describe('buildProjectionBackfillPlan', () => {
  it('returns invalid plan when input is null', () => {
    const plan = buildProjectionBackfillPlan(null);
    expect(plan.valid).toBe(false);
    expect(plan.blockers[0].code).toBe('invalid-input');
  });

  it('returns invalid plan when input is undefined', () => {
    const plan = buildProjectionBackfillPlan();
    expect(plan.valid).toBe(false);
    expect(plan.blockers[0].code).toBe('invalid-input');
  });

  it('returns invalid plan when input is not an object', () => {
    const plan = buildProjectionBackfillPlan('invalid string');
    expect(plan.valid).toBe(false);
    expect(plan.blockers[0].code).toBe('invalid-input');
  });

  it('rejects non-integer batchSize', () => {
    const plan = buildProjectionBackfillPlan(
      {
        readinessAssessment: { overallStatus: 'ready-for-backfill-design', written: false },
        targets: [{ targetType: 'object', targetId: 'o1' }]
      },
      { batchSize: 5.5 }
    );
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-batch-size')).toBe(true);
  });

  it('rejects targetId with leading whitespace', () => {
    const plan = buildProjectionBackfillPlan(
      {
        readinessAssessment: { overallStatus: 'ready-for-backfill-design', written: false },
        targets: [{ targetType: 'object', targetId: ' o1' }]
      }
    );
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-target-id')).toBe(true);
    expect(plan.blockers.some(b => b.message.includes('whitespace'))).toBe(true);
  });

  it('rejects targetId with trailing whitespace', () => {
    const plan = buildProjectionBackfillPlan(
      {
        readinessAssessment: { overallStatus: 'ready-for-backfill-design', written: false },
        targets: [{ targetType: 'object', targetId: 'o1 ' }]
      }
    );
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-target-id')).toBe(true);
    expect(plan.blockers.some(b => b.message.includes('whitespace'))).toBe(true);
  });
});
