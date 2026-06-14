import { describe, it, expect } from 'vitest';
import {
  buildProjectionBackfillOperationValidationBundle,
  formatProjectionBackfillOperationValidationBundle
} from '../scripts/lib/projection-backfill-operation-validation-bundle.mjs';

describe('projection-backfill-operation-validation-bundle', () => {

  const baseOperationPacket = {
    packetType: 'projection-backfill-operation-packet',
    valid: true,
    written: false,
    mode: 'dryRun',
    totalTargets: 2,
    batches: [
      {
        batchIndex: 0,
        targets: [
          { targetType: 'object', targetId: 'o1', summaryPath: 'objectSummaries/o1' },
          { targetType: 'marker', targetId: 'm1', summaryPath: 'markerSummaries/m1' }
        ]
      }
    ]
  };

  const baseRecomputeResponses = [
    { targetType: 'object', targetId: 'o1', success: true, dryRun: true, written: false },
    { targetType: 'marker', targetId: 'm1', success: true, dryRun: true, written: false }
  ];

  it('builds valid dry-run evidence bundle from packet and matching recompute responses', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses
        }
      ]
    });

    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('dry-run-evidence-pass');
    expect(bundle.batchCount).toBe(1);
    expect(bundle.validatedBatchCount).toBe(1);
    expect(bundle.recomputeResponseCount).toBe(2);
  });

  it('builds valid manual-write evidence bundle from packet, matching recompute responses, and equal post evidence', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];

    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };

    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };

    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse,
          postReconciliationResponse
        }
      ]
    });

    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('manual-write-evidence-pass');
  });

  it('rejects missing operation packet', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({ operationPacket: null, batches: [] });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('missing-packet');
  });

  it('rejects invalid operation packet type', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: { ...baseOperationPacket, packetType: 'other' },
      batches: []
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('invalid-packet-type');
  });

  it('rejects invalid operation packet', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: { ...baseOperationPacket, valid: false },
      batches: []
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('invalid-packet');
  });

  it('rejects packet where written !== false', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: { ...baseOperationPacket, written: true },
      batches: []
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('invalid-packet-written');
  });

  it('rejects unknown packet mode', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: { ...baseOperationPacket, mode: 'unknown' },
      batches: []
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('invalid-mode');
  });

  it('rejects missing batch evidence', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: []
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('missing-batch-evidence');
  });

  it('rejects extra batch evidence', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        { batchIndex: 0, recomputeResponses: baseRecomputeResponses },
        { batchIndex: 1, recomputeResponses: [] }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('extra-batch-evidence');
  });

  it('rejects duplicate batch evidence', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        { batchIndex: 0, recomputeResponses: baseRecomputeResponses },
        { batchIndex: 0, recomputeResponses: [] }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail');
    expect(bundle.blockers[0].code).toBe('duplicate-batch-evidence');
  });

  it('rejects missing recompute response', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: [ baseRecomputeResponses[0] ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers[0].code).toBe('missing-recompute-response');
  });

  it('rejects duplicate recompute response', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: [ ...baseRecomputeResponses, baseRecomputeResponses[0] ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers[0].code).toBe('duplicate-recompute-response');
  });

  it('rejects recompute target mismatch', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: [
            baseRecomputeResponses[0],
            { targetType: 'place', targetId: 'p1', success: true, dryRun: true, written: false }
          ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'mismatched-recompute-target')).toBe(true);
  });

  it('rejects recompute dryRun mismatch', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: [
            baseRecomputeResponses[0],
            { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: false }
          ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'dryrun-mismatch')).toBe(true);
  });

  it('rejects recompute written mismatch', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          preReconciliationResponse: { success: true, totalTargets: 2, equalCount: 2, results: [{targetType:'object',targetId:'o1',success:true,reconciliation:{equal:true}},{targetType:'marker',targetId:'m1',success:true,reconciliation:{equal:true}}] },
          postReconciliationResponse: { success: true, totalTargets: 2, equalCount: 2, results: [{targetType:'object',targetId:'o1',success:true,reconciliation:{equal:true}},{targetType:'marker',targetId:'m1',success:true,reconciliation:{equal:true}}] },
          recomputeResponses: [
            { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
            { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: false } // mismatch!
          ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'written-mismatch')).toBe(true);
  });

  it('rejects failed recompute response', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: [
            baseRecomputeResponses[0],
            { targetType: 'marker', targetId: 'm1', success: false, dryRun: true, written: false }
          ]
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'failed-recompute-response')).toBe(true);
  });

  it('rejects post/report target mismatch', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'place', targetId: 'p1', success: true, reconciliation: { equal: true } } // Mismatch!
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail'); // fail due to extra target
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-missing-target')).toBe(true);
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-extra-target')).toBe(true);
  });

  it('rejects post/report countMismatch', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 5, // Count mismatch!
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail'); // count mismatch is a fail
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-count-mismatch')).toBe(true);
  });

  it('manual-write mode blocks on post/report target different', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       differentCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: false, differenceCount: 1 } } // Not equal!
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-target-not-equal')).toBe(true);
  });

  it('manual-write mode blocks on post/report target missing-summary', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       missingSummaryCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, existingSummaryExists: false } // Not equal!
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-target-not-equal')).toBe(true);
  });

  it('manual-write mode passes when both post and report are present and equal', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const evidence = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const preEvidence = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse: preEvidence,
          postReconciliationResponse: evidence,
          reconciliationReport: evidence
        }
      ]
    });
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('manual-write-evidence-pass');
  });

  it('blocks if both artifacts are present but disagree on target status', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const reconciliationReport = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       differentCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: false, differenceCount: 1 } }
       ]
    };

    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          postReconciliationResponse,
          reconciliationReport
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-report-status-mismatch')).toBe(true);
  });

  it('blocks if both artifacts are present and report has extra target', () => {
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const reconciliationReport = {
       success: true,
       totalTargets: 3,
       equalCount: 3,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } },
         { targetType: 'place', targetId: 'p1', success: true, reconciliation: { equal: true } }
       ]
    };

    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          postReconciliationResponse,
          reconciliationReport
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail'); // count mismatch / extra target is a fail
    expect(bundle.batches[0].blockers.some(b => b.code === 'report-extra-target')).toBe(true);
  });

  it('dryRun mode warns when both agree on different, but blocks if they disagree', () => {
    const diffEvidence = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       differentCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: false, differenceCount: 1 } }
       ]
    };

    // Agree
    const bundleAgree = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          postReconciliationResponse: diffEvidence,
          reconciliationReport: diffEvidence
        }
      ]
    });
    expect(bundleAgree.valid).toBe(true);
    expect(bundleAgree.overallStatus).toBe('dry-run-evidence-pass');

    // Disagree
    const equalEvidence = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundleDisagree = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          postReconciliationResponse: equalEvidence,
          reconciliationReport: diffEvidence
        }
      ]
    });
    expect(bundleDisagree.valid).toBe(false);
    expect(bundleDisagree.overallStatus).toBe('blocked');
    expect(bundleDisagree.batches[0].blockers.some(b => b.code === 'post-report-status-mismatch')).toBe(true);
  });

  it('already-normalized reconciliationReport is accepted', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    // This uses the shape that buildProjectionReconciliationReport outputs
    const normalizedReport = {
      success: true,
      written: false,
      includeSummaries: false,
      totalTargets: 2,
      equalCount: 2,
      differentCount: 0,
      missingSummaryCount: 0,
      errorCount: 0,
      computedCounts: {
        equal: 2,
        different: 0,
        missingSummary: 0,
        errors: 0
      },
      countMismatch: false,
      overallStatus: 'pass',
      targets: [
        { targetType: 'object', targetId: 'o1', summaryPath: 'objectSummaries/o1', status: 'equal', differenceCount: 0 },
        { targetType: 'marker', targetId: 'm1', summaryPath: 'markerSummaries/m1', status: 'equal', differenceCount: 0 }
      ]
    };

    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };

    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          preReconciliationResponse,
          reconciliationReport: normalizedReport
        }
      ]
    });

    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('manual-write-evidence-pass');
    expect(bundle.batches[0].reportStatus).toBe('pass');
  });

  it('normalized report with extra target is still a blocker', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const normalizedReport = {
      success: true,
      written: false,
      includeSummaries: false,
      totalTargets: 3,
      equalCount: 3,
      differentCount: 0,
      missingSummaryCount: 0,
      errorCount: 0,
      computedCounts: { equal: 3, different: 0, missingSummary: 0, errors: 0 },
      countMismatch: false,
      overallStatus: 'pass',
      targets: [
        { targetType: 'object', targetId: 'o1', summaryPath: 'objectSummaries/o1', status: 'equal', differenceCount: 0 },
        { targetType: 'marker', targetId: 'm1', summaryPath: 'markerSummaries/m1', status: 'equal', differenceCount: 0 },
        { targetType: 'place', targetId: 'p1', summaryPath: 'placeSummaries/p1', status: 'equal', differenceCount: 0 }
      ]
    };

    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          reconciliationReport: normalizedReport
        }
      ]
    });

    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('fail'); // count mismatch / extra target is a fail
    expect(bundle.batches[0].blockers.some(b => b.code === 'report-extra-target')).toBe(true);
  });

  it('manual-write mode blocks if preReconciliationResponse is missing', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'missing-pre-evidence')).toBe(true);
  });

  it('dryRun mode does not block if preReconciliationResponse is missing', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses
        }
      ]
    });
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('dry-run-evidence-pass');
    expect(bundle.batches[0].blockers.length).toBe(0);
  });

  it('blocks if preReconciliationResponse has success: false or overallStatus: fail', () => {
    const preReconciliationResponse = {
       success: false,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          preReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'failed-pre-report')).toBe(true);
  });

  it('blocks if postReconciliationResponse has success: false or overallStatus: fail', () => {
    const postReconciliationResponse = {
       success: false,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-failed-report')).toBe(true);
  });

  it('blocks if reconciliationReport has success: false or overallStatus: fail', () => {
    const reconciliationReport = {
       success: false,
       totalTargets: 2,
       equalCount: 2,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: true } }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          reconciliationReport
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'report-failed-report')).toBe(true);
  });

  it('manual-write mode blocks on post/report target error', () => {
    const writePacket = { ...baseOperationPacket, mode: 'manual-write-plan' };
    const writeRecomputeResponses = [
      { targetType: 'object', targetId: 'o1', success: true, dryRun: false, written: true },
      { targetType: 'marker', targetId: 'm1', success: true, dryRun: false, written: true }
    ];
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       errorCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: false, error: { message: "fail" } } // Error!
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: writePacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: writeRecomputeResponses,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(false);
    expect(bundle.overallStatus).toBe('blocked');
    expect(bundle.batches[0].blockers.some(b => b.code === 'post-target-not-equal')).toBe(true);
  });

  it('dryRun mode warns but does not block solely on post/report different', () => {
    const postReconciliationResponse = {
       success: true,
       totalTargets: 2,
       equalCount: 1,
       differentCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: true } },
         { targetType: 'marker', targetId: 'm1', success: true, reconciliation: { equal: false, differenceCount: 1 } } // Not equal!
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          postReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('dry-run-evidence-pass');
    expect(bundle.batches[0].warnings.some(w => w.code === 'post-target-not-equal')).toBe(true);
  });

  it('pre-reconciliation differences are warnings, not blockers', () => {
    const preReconciliationResponse = {
       success: true,
       totalTargets: 2,
       differentCount: 1,
       missingSummaryCount: 1,
       results: [
         { targetType: 'object', targetId: 'o1', success: true, reconciliation: { equal: false, differenceCount: 1 } },
         { targetType: 'marker', targetId: 'm1', success: true, existingSummaryExists: false }
       ]
    };
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses,
          preReconciliationResponse
        }
      ]
    });
    expect(bundle.valid).toBe(true);
    expect(bundle.overallStatus).toBe('dry-run-evidence-pass');
    expect(bundle.batches[0].warnings.some(w => w.code === 'pre-reconciliation-attention')).toBe(true);
  });

  it('formatter JSON output is parseable', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses
        }
      ]
    });
    const jsonStr = formatProjectionBackfillOperationValidationBundle(bundle, { json: true });
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });

  it('readable formatter includes safety note', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({
      operationPacket: baseOperationPacket,
      batches: [
        {
          batchIndex: 0,
          recomputeResponses: baseRecomputeResponses
        }
      ]
    });
    const str = formatProjectionBackfillOperationValidationBundle(bundle);
    expect(str).toContain('SAFETY NOTE');
    expect(str).toContain('- It does not perform backfill execution.');
  });

  it('invalid bundle includes blockers in formatter', () => {
    const bundle = buildProjectionBackfillOperationValidationBundle({ operationPacket: null, batches: [] });
    const str = formatProjectionBackfillOperationValidationBundle(bundle);
    expect(str).toContain('BLOCKERS:');
    expect(str).toContain('missing-packet');
  });

  it('manifest-style CLI fixture shape can be represented by the helper input', () => {
     // A CLI passes data as { operationPacket, batches: [ { batchIndex, recomputeResponses, pre..., post..., report... } ] }
     // This verifies the bundle generator doesn't explode if passed properties from a typical manifest workflow
     const bundle = buildProjectionBackfillOperationValidationBundle({
       operationPacket: baseOperationPacket,
       batches: [
         {
            batchIndex: 0,
            preReconciliationResponse: null,
            recomputeResponses: baseRecomputeResponses,
            postReconciliationResponse: null,
            reconciliationReport: null
         }
       ]
     });
     expect(bundle.valid).toBe(true);
     expect(bundle.overallStatus).toBe('dry-run-evidence-pass');
  });
});
