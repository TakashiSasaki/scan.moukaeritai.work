import { describe, it, expect } from 'vitest';
import {
  buildProjectionBackfillControlledExecutionReviewContract,
  formatProjectionBackfillControlledExecutionReviewContract
} from '../scripts/lib/projection-backfill-controlled-execution-review-contract.mjs';

const mockValidPacket = {
  overallStatus: "ready-for-controlled-execution-design-review",
  bundleCount: 1,
  totalTargets: 3,
  evidenceModes: ["dry-run-evidence-pass"],
  executionAuthorization: false,
  written: false,
  executed: false,
  contractType: "not-a-review-contract"
};

const mockValidGate = {
  valid: true,
  success: true,
  overallStatus: "ready-for-execution-design",
  executionAuthorization: false,
  written: false,
  executed: false,
  bundleCount: 1
};

const mockValidBundle = {
  overallStatus: "dry-run-evidence-pass"
};

describe('buildProjectionBackfillControlledExecutionReviewContract', () => {
  it('creates a valid ready contract when provided valid inputs', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle],
      environment: 'test',
      operator: 'jules'
    });

    expect(contract.overallStatus).toBe('ready-for-controlled-execution-design-review');
    expect(contract.success).toBe(true);
    expect(contract.valid).toBe(true);
    expect(contract.executionAuthorization).toBe(false);
    expect(contract.written).toBe(false);
    expect(contract.executed).toBe(false);
  });

  it('fails if packet status is not ready-for-controlled-execution-design-review', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: { ...mockValidPacket, overallStatus: 'fail' },
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.success).toBe(false);
    expect(contract.blockers.some(b => b.code === 'invalid-packet-status')).toBe(true);
  });

  it('fails if packet executionAuthorization is true', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: { ...mockValidPacket, executionAuthorization: true },
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'packet-execution-authorization')).toBe(true);
  });

  it('fails if packet executed is true', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: { ...mockValidPacket, executed: true },
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'packet-executed')).toBe(true);
  });

  it('fails if gate status is not ready-for-execution-design', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: { ...mockValidGate, overallStatus: 'fail' },
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'invalid-gate-status')).toBe(true);
  });

  it('fails if gate executionAuthorization is true', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: { ...mockValidGate, executionAuthorization: true },
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'gate-execution-authorization')).toBe(true);
  });

  it('fails if gate bundle count mismatches packet bundle count', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket, // bundleCount: 1
      executionDesignGate: { ...mockValidGate, bundleCount: 2 },
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'gate-bundle-count-mismatch')).toBe(true);
  });

  it('fails if bundles array length mismatches packet bundle count', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket, // bundleCount: 1
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle, mockValidBundle] // length 2
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'bundle-count-mismatch')).toBe(true);
  });

  it('fails if forbidden status string is found in input', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: { ...mockValidPacket, someField: 'ready-for-backfill-execution' },
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.overallStatus).toBe('fail');
    expect(contract.blockers.some(b => b.code === 'forbidden-status-string')).toBe(true);
  });

  it('includes required approval boundary items', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.approvalBoundary).toContain('this contract is not execution approval');
    expect(contract.approvalBoundary).toContain('no UI read switching is authorized');
  });

  it('includes required nonGoals items', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    expect(contract.nonGoals).toContain('broad backfill execution');
    expect(contract.nonGoals).toContain('scheduled recompute');
  });
});

describe('formatProjectionBackfillControlledExecutionReviewContract', () => {
  it('formats output without forbidden strings', () => {
    const contract = buildProjectionBackfillControlledExecutionReviewContract({
      controlledExecutionDesignPacket: mockValidPacket,
      executionDesignGate: mockValidGate,
      operationValidationBundles: [mockValidBundle]
    });

    const formatted = formatProjectionBackfillControlledExecutionReviewContract(contract);
    expect(formatted).toContain('ready-for-controlled-execution-design-review');
    expect(formatted).not.toContain('ready-for-backfill-execution');
    expect(formatted).not.toContain('ready-for-ui-read-switching');
    expect(formatted).not.toContain('backfill-complete');
    expect(formatted).not.toContain('production-ready');
    expect(formatted).toContain('*** SAFETY NOTE ***');
    expect(formatted).toContain('- ready-for-controlled-execution-design-review is NOT execution authorization.');
  });
});
