import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillControlledExecutionDesignPacket, formatProjectionBackfillControlledExecutionDesignPacket } from '../scripts/lib/projection-backfill-controlled-execution-design-packet.mjs';

describe('buildProjectionBackfillControlledExecutionDesignPacket', () => {
  const mockValidGate = {
    gateType: 'projection-backfill-execution-design-gate',
    overallStatus: 'ready-for-execution-design',
    written: false,
    success: true,
    valid: true
  };

  const mockValidBundle = {
    bundleType: 'projection-backfill-operation-validation-bundle',
    overallStatus: 'dry-run-evidence-pass',
    written: false,
    success: true,
    valid: true,
    batches: [
      {
        targets: [
          { targetType: 'object', targetId: 'obj1' },
          { targetType: 'marker', targetId: 'mk1' }
        ]
      }
    ]
  };

  const mockValidBundle2 = {
    bundleType: 'projection-backfill-operation-validation-bundle',
    overallStatus: 'manual-write-evidence-pass',
    written: false,
    success: true,
    valid: true,
    batches: [
      {
        targets: [
          { targetType: 'place', targetId: 'pl1' }
        ]
      }
    ]
  };

  it('returns positive status for valid single bundle', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(packet.success).toBe(true);
    expect(packet.valid).toBe(true);
    expect(packet.executionAuthorization).toBe(false);
    expect(packet.written).toBe(false);
    expect(packet.executed).toBe(false);
    expect(packet.totalTargets).toBe(2);
    expect(packet.targetTypeCoverage['object'].targetCount).toBe(1);
    expect(packet.targetTypeCoverage['marker'].targetCount).toBe(1);
    expect(packet.evidenceModes).toContain('dry-run-evidence-pass');
    expect(packet.bundleCount).toBe(1);
  });

  it('returns positive status for multiple valid bundles and aggregates coverage', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle, mockValidBundle2]
    });

    expect(packet.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(packet.success).toBe(true);
    expect(packet.totalTargets).toBe(3);
    expect(packet.targetTypeCoverage['object'].targetCount).toBe(1);
    expect(packet.targetTypeCoverage['marker'].targetCount).toBe(1);
    expect(packet.targetTypeCoverage['place'].targetCount).toBe(1);
    expect(packet.evidenceModes).toContain('dry-run-evidence-pass');
    expect(packet.evidenceModes).toContain('manual-write-evidence-pass');
    expect(packet.bundleCount).toBe(2);
  });

  it('fails if gate type is incorrect', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, gateType: 'wrong-type' },
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-gate-type')).toBe(true);
  });

  it('fails if gate is invalid or unsuccessful', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, valid: false },
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-gate-state')).toBe(true);
  });

  it('fails if gate status is not ready-for-execution-design', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, overallStatus: 'blocked' },
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-gate-status')).toBe(true);
  });

  it('fails if gate status is fail', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, overallStatus: 'fail' },
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
  });

  it('fails if bundle written flag is true', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [{ ...mockValidBundle, written: true }]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'bundle-written')).toBe(true);
  });

  it('blocks if target coverage is empty', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [{ ...mockValidBundle, batches: [] }]
    });

    expect(packet.overallStatus).toBe('blocked');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'empty-target-coverage')).toBe(true);
  });

  it('fails if bundle type is incorrect', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [{ ...mockValidBundle, bundleType: 'wrong-type' }]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-bundle-type')).toBe(true);
  });

  it('fails if bundle is invalid or unsuccessful', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [{ ...mockValidBundle, valid: false }]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-bundle')).toBe(true);
  });

  it('fails if overallStatus is an arbitrary string including pass', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [{ ...mockValidBundle, overallStatus: 'not-a-real-pass' }]
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-bundle-status')).toBe(true);
  });

  it('supports legacy fallback for singular input', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundle: mockValidBundle
    });

    expect(packet.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(packet.success).toBe(true);
    expect(packet.totalTargets).toBe(2);
  });

  it('enforces safety boundaries and rollback policies', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(packet.safetyBoundaries).toContain('local-only');
    expect(packet.safetyBoundaries).toContain('no UI read switching authorization');
    expect(packet.rollbackPolicy.strategy).toContain('derived and rebuildable');
  });
});

describe('formatProjectionBackfillControlledExecutionDesignPacket', () => {
  it('formats output with safety note included', () => {
    const packet = {
      valid: true,
      overallStatus: 'ready-for-controlled-execution-design-review',
      environment: 'test',
      operator: 'github',
      sourceGateStatus: 'ready-for-execution-design',
      evidenceModes: ['dry-run-evidence-pass'],
      bundleCount: 1,
      totalTargets: 1,
      targetTypeCoverage: { object: { targetCount: 1 } },
      blockers: [],
      warnings: [],
      notes: [],
      executionAuthorization: false,
      written: false,
      executed: false
    };

    const formatted = formatProjectionBackfillControlledExecutionDesignPacket(packet);
    expect(formatted).toContain('Overall Status: ready-for-controlled-execution-design-review');
    expect(formatted).toContain('*** SAFETY NOTE ***');
    expect(formatted).toContain('- ready-for-controlled-execution-design-review is NOT execution authorization.');
  });
});
