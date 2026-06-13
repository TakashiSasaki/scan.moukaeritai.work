import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillPlan, formatProjectionBackfillPlan } from '../scripts/lib/projection-backfill-plan.mjs';

describe('projectionBackfillPlan', () => {
  const readyAssessment = {
    overallStatus: 'ready-for-backfill-design',
    written: false
  };

  const basicTargets = [
    { targetType: 'object', targetId: 'obj1' },
    { targetType: 'marker', targetId: 'mk1' },
    { targetType: 'place', targetId: 'pl1' }
  ];

  it('1. builds valid dryRun plan from ready readiness assessment and explicit object/marker/place targets', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets });
    expect(plan.valid).toBe(true);
    expect(plan.mode).toBe('dryRun');
    expect(plan.totalTargets).toBe(3);
    expect(plan.batches.length).toBe(1);
    expect(plan.batches[0].targets.length).toBe(3);
  });

  it('2. rejects missing readiness assessment', () => {
    const plan = buildProjectionBackfillPlan({ targets: basicTargets });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'missing-readiness')).toBe(true);
  });

  it('3. rejects readiness blocked', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: { overallStatus: 'blocked', written: false }, targets: basicTargets });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'readiness-not-ready')).toBe(true);
  });

  it('4. rejects readiness fail', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: { overallStatus: 'fail', written: false }, targets: basicTargets });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'readiness-not-ready')).toBe(true);
  });

  it('5. rejects readiness where written !== false', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: { overallStatus: 'ready-for-backfill-design', written: true }, targets: basicTargets });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'readiness-written')).toBe(true);
  });

  it('6. rejects empty target list', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: [] });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-targets')).toBe(true);
  });

  it('7. rejects duplicate target keys', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: [...basicTargets, { targetType: 'object', targetId: 'obj1' }] });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'duplicate-target')).toBe(true);
  });

  it('8. rejects invalid targetType', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: [{ targetType: 'unknown', targetId: 'obj1' }] });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-target-type')).toBe(true);
  });

  it('9. rejects blank targetId', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: [{ targetType: 'object', targetId: '  ' }] });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-target-id')).toBe(true);
  });

  it('10. rejects targetId containing /', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: [{ targetType: 'object', targetId: 'obj/1' }] });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-target-id')).toBe(true);
  });

  it('11. uses default batch size 20', () => {
    const targets = Array.from({ length: 25 }, (_, i) => ({ targetType: 'object', targetId: `obj${i}` }));
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets });
    expect(plan.valid).toBe(true);
    expect(plan.batchSize).toBe(20);
    expect(plan.batches.length).toBe(2);
    expect(plan.batches[0].targets.length).toBe(20);
    expect(plan.batches[1].targets.length).toBe(5);
  });

  it('12. respects custom batch size', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets }, { batchSize: 2 });
    expect(plan.valid).toBe(true);
    expect(plan.batchSize).toBe(2);
    expect(plan.batches.length).toBe(2);
    expect(plan.batches[0].targets.length).toBe(2);
    expect(plan.batches[1].targets.length).toBe(1);
  });

  it('13. rejects batch size less than 1', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets }, { batchSize: 0 });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-batch-size')).toBe(true);
  });

  it('14. rejects batch size greater than 20', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets }, { batchSize: 21 });
    expect(plan.valid).toBe(false);
    expect(plan.blockers.some(b => b.code === 'invalid-batch-size')).toBe(true);
  });

  it('15. preserves input order', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets });
    expect(plan.valid).toBe(true);
    expect(plan.batches[0].targets[0].targetId).toBe('obj1');
    expect(plan.batches[0].targets[1].targetId).toBe('mk1');
    expect(plan.batches[0].targets[2].targetId).toBe('pl1');
  });

  it('16. generates dryRun payloads with dryRun:true in dryRun mode', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets }, { mode: 'dryRun' });
    expect(plan.valid).toBe(true);
    expect(plan.batches[0].targets[0].recomputePayload.data.dryRun).toBe(true);
  });

  it('17. generates payloads with dryRun:false in manual-write-plan mode', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets }, { mode: 'manual-write-plan' });
    expect(plan.valid).toBe(true);
    expect(plan.batches[0].targets[0].recomputePayload.data.dryRun).toBe(false);
  });

  it('18. formatter JSON output is parseable', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets });
    const jsonStr = formatProjectionBackfillPlan(plan, { json: true });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.valid).toBe(true);
    expect(parsed.batches.length).toBe(1);
  });

  it('19. readable formatter includes safety note', () => {
    const plan = buildProjectionBackfillPlan({ readinessAssessment: readyAssessment, targets: basicTargets });
    const str = formatProjectionBackfillPlan(plan, { json: false });
    expect(str).toContain('[SAFETY NOTE]');
    expect(str).toContain('does not execute backfill');
  });

  it('20. invalid plan includes blockers', () => {
    const plan = buildProjectionBackfillPlan({ targets: basicTargets });
    const str = formatProjectionBackfillPlan(plan, { json: false });
    expect(str).toContain('[INVALID BACKFILL PLAN]');
    expect(str).toContain('readinessAssessment is missing');
  });
});
