import { describe, it, expect } from 'vitest';
import {
  buildProjectionBackfillOperationPacket,
  formatProjectionBackfillOperationPacket
} from '../scripts/lib/projection-backfill-operation-packet.mjs';

const validReadinessAssessment = {
  overallStatus: 'ready-for-backfill-design',
  written: false
};

const validTargets = [
  { targetType: 'object', targetId: 'o1' },
  { targetType: 'marker', targetId: 'm1' }
];

const validBackfillPlan = {
  success: true,
  valid: true,
  mode: 'dryRun',
  batchSize: 20,
  totalTargets: 2,
  batchCount: 1,
  batches: [
    {
      batchIndex: 0,
      targetCount: 2,
      targets: [
        { targetType: 'object', targetId: 'o1' },
        { targetType: 'marker', targetId: 'm1' }
      ]
    }
  ],
  blockers: [],
  warnings: [],
  notes: ['plan notes'],
  written: false
};

describe('projection-backfill-operation-packet', () => {
  describe('buildProjectionBackfillOperationPacket', () => {
    it('builds valid packet from readiness assessment and explicit targets', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets,
        notes: ['explicit targets note']
      });

      expect(packet.valid).toBe(true);
      expect(packet.success).toBe(true);
      expect(packet.totalTargets).toBe(2);
      expect(packet.batchCount).toBe(1);
      expect(packet.notes).toContain('explicit targets note');
      expect(packet.written).toBe(false);
      expect(packet.validationChecklist.length).toBe(5);
      expect(packet.batches[0].expectedArtifactNames).toBeDefined();
    });

    it('builds valid packet from readiness assessment and existing valid backfill plan', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        backfillPlan: validBackfillPlan,
        notes: ['extra note']
      });

      expect(packet.valid).toBe(true);
      expect(packet.success).toBe(true);
      expect(packet.totalTargets).toBe(2);
      expect(packet.batchCount).toBe(1);
      expect(packet.notes).toContain('plan notes');
      expect(packet.notes).toContain('extra note');
      expect(packet.written).toBe(false);
      expect(packet.validationChecklist.length).toBe(5);
      expect(packet.batches[0].expectedArtifactNames).toBeDefined();
    });

    it('rejects missing readiness assessment', () => {
      const packet = buildProjectionBackfillOperationPacket({
        targets: validTargets
      } as any);

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'missing-readiness')).toBe(true);
      expect(packet.written).toBe(false);
    });

    it('rejects readiness blocked', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: { overallStatus: 'blocked', written: false },
        targets: validTargets
      });

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'readiness-not-ready')).toBe(true);
    });

    it('rejects readiness fail', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: { overallStatus: 'fail', written: false },
        targets: validTargets
      });

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'readiness-not-ready')).toBe(true);
    });

    it('rejects readiness where written !== false', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: { overallStatus: 'ready-for-backfill-design', written: true },
        targets: validTargets
      });

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'readiness-written')).toBe(true);
    });

    it('rejects missing targets and missing plan', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment
      });

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'missing-plan-and-targets')).toBe(true);
    });

    it('rejects invalid backfill plan', () => {
      const invalidPlan = { ...validBackfillPlan, valid: false, blockers: [{ code: 'test', message: 'test' }] };
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        backfillPlan: invalidPlan
      });

      expect(packet.valid).toBe(false);
      expect(packet.blockers.some(b => b.code === 'invalid-backfill-plan')).toBe(true);
    });

    it('preserves plan mode dryRun', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      }, { mode: 'dryRun' });

      expect(packet.valid).toBe(true);
      expect(packet.mode).toBe('dryRun');
    });

    it('preserves plan mode manual-write-plan', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      }, { mode: 'manual-write-plan' });

      expect(packet.valid).toBe(true);
      expect(packet.mode).toBe('manual-write-plan');
    });

    it('includes expected artifact names per batch', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      });

      expect(packet.valid).toBe(true);
      const batch = packet.batches[0];
      expect(batch.expectedArtifactNames.preReconciliationResponse).toBe('batch-000-pre-reconciliation.json');
      expect(batch.expectedArtifactNames.recomputeResponse).toBe('batch-000-recompute-response.json');
      expect(batch.expectedArtifactNames.postReconciliationResponse).toBe('batch-000-post-reconciliation.json');
      expect(batch.expectedArtifactNames.reconciliationReport).toBe('batch-000-reconciliation-report.json');
    });

    it('includes validation checklist', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      });

      expect(packet.valid).toBe(true);
      const steps = packet.validationChecklist.map(s => s.step);
      expect(steps).toEqual([
        'pre-reconciliation',
        'manual-recompute-payloads',
        'post-reconciliation',
        'local-report',
        'validation-bundle'
      ]);
    });

    it('includes target file notes', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets,
        notes: ['test note 1', 'test note 2']
      });

      expect(packet.valid).toBe(true);
      expect(packet.notes).toContain('test note 1');
      expect(packet.notes).toContain('test note 2');
    });

    it('includes environment and operator when provided', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      }, { environment: 'local', operator: 'jdoe' });

      expect(packet.valid).toBe(true);
      expect(packet.environment).toBe('local');
      expect(packet.operator).toBe('jdoe');
    });

    it('returns written:false', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      });

      expect(packet.written).toBe(false);
    });
  });

  describe('formatProjectionBackfillOperationPacket', () => {
    it('formatter JSON output is parseable', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      });

      const jsonStr = formatProjectionBackfillOperationPacket(packet, { json: true });
      const parsed = JSON.parse(jsonStr);
      expect(parsed.valid).toBe(true);
    });

    it('readable formatter includes safety note', () => {
      const packet = buildProjectionBackfillOperationPacket({
        readinessAssessment: validReadinessAssessment,
        targets: validTargets
      });

      const out = formatProjectionBackfillOperationPacket(packet);
      expect(out).toContain('[SAFETY NOTE]');
      expect(out).toContain('It does not call Firebase.');
      expect(out).toContain('It does not perform writes.');
    });

    it('invalid packet includes blockers', () => {
      const packet = buildProjectionBackfillOperationPacket({
        targets: validTargets
      } as any);

      const out = formatProjectionBackfillOperationPacket(packet);
      expect(out).toContain('[INVALID PROJECTION BACKFILL OPERATION PACKET]');
      expect(out).toContain('missing-readiness');
    });
  });
});
