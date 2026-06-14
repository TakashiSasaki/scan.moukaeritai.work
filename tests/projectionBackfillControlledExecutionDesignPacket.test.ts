import { describe, it, expect } from 'vitest';
import { buildProjectionBackfillControlledExecutionDesignPacket, formatProjectionBackfillControlledExecutionDesignPacket } from '../scripts/lib/projection-backfill-controlled-execution-design-packet.mjs';

describe('buildProjectionBackfillControlledExecutionDesignPacket', () => {
  const mockValidGate = {
    overallStatus: 'ready-for-execution-design',
    written: false,
    success: true,
    valid: true
  };

  const mockValidBundle = {
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

  it('returns positive status for valid inputs', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundle: mockValidBundle
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
  });

  it('fails if gate status is not ready-for-execution-design', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, overallStatus: 'blocked' },
      operationValidationBundle: mockValidBundle
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'invalid-gate-status')).toBe(true);
  });

  it('fails if gate status is fail', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: { ...mockValidGate, overallStatus: 'fail' },
      operationValidationBundle: mockValidBundle
    });

    expect(packet.overallStatus).toBe('fail'); // blocked sets blocked, but fail sets fail, and it triggers fail block
    expect(packet.success).toBe(false);
  });

  it('fails if bundle written flag is true', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundle: { ...mockValidBundle, written: true }
    });

    expect(packet.overallStatus).toBe('fail');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'bundle-written')).toBe(true);
  });

  it('blocks if target coverage is empty', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundle: { ...mockValidBundle, batches: [] }
    });

    expect(packet.overallStatus).toBe('blocked');
    expect(packet.success).toBe(false);
    expect(packet.blockers.some(b => b.code === 'empty-target-coverage')).toBe(true);
  });

  it('enforces safety boundaries and rollback policies', () => {
    const packet = buildProjectionBackfillControlledExecutionDesignPacket({
      executionDesignGate: mockValidGate,
      operationValidationBundle: mockValidBundle
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
