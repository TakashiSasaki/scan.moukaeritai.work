/**
 * Helper for building projection backfill operation packets.
 * This is a pure helper and does not depend on Firebase or specific environments.
 */

import { buildProjectionBackfillPlan } from './projection-backfill-plan.mjs';

/**
 * Builds a projection backfill operation packet.
 * @param {Object} input
 * @param {Object} input.readinessAssessment
 * @param {Object} [input.backfillPlan]
 * @param {Array<{targetType: string, targetId: string, summaryPath?: string}>} [input.targets]
 * @param {string[]} [input.notes]
 * @param {Object} [options={}]
 * @param {string} [options.operator]
 * @param {string} [options.environment]
 * @param {string} [options.mode="dryRun"]
 * @param {number} [options.batchSize=20]
 * @returns {Object}
 */
export function buildProjectionBackfillOperationPacket(input, options = {}) {
  const { readinessAssessment, backfillPlan, targets, notes = [] } = input || {};
  const operator = options.operator !== undefined ? options.operator : (input && input.operator);
  const environment = options.environment !== undefined ? options.environment : (input && input.environment) || 'staging';

  const packet = {
    success: true,
    valid: true,
    packetType: 'projection-backfill-operation-packet',
    mode: 'dryRun',
    environment,
    operator,
    createdAt: new Date().toISOString(),
    readinessStatus: '',
    totalTargets: 0,
    batchCount: 0,
    batches: [],
    validationChecklist: [
      {
        step: 'pre-reconciliation',
        required: true,
        description: 'Run selected-target reconciliation before any manual recompute payload is used.'
      },
      {
        step: 'manual-recompute-payloads',
        required: true,
        description: 'Use generated payloads only through explicit operator action.'
      },
      {
        step: 'post-reconciliation',
        required: true,
        description: 'Run selected-target reconciliation after manual recompute.'
      },
      {
        step: 'local-report',
        required: true,
        description: 'Generate local reconciliation report from saved response.'
      },
      {
        step: 'validation-bundle',
        required: true,
        description: 'Validate saved canary/backfill evidence locally.'
      }
    ],
    blockers: [],
    warnings: [
      {
        code: 'not-execution',
        message: 'This packet does not execute backfill.'
      },
      {
        code: 'no-ui-switching',
        message: 'This packet does not authorize UI read switching.'
      }
    ],
    notes: [],
    written: false
  };

  if (!operator) {
    delete packet.operator; // Omit if empty
  }

  if (!readinessAssessment) {
    packet.success = false;
    packet.valid = false;
    packet.blockers.push({ code: 'missing-readiness', message: 'readinessAssessment is missing.' });
  } else {
    packet.readinessStatus = readinessAssessment.overallStatus;
    if (readinessAssessment.overallStatus !== 'ready-for-backfill-design') {
      packet.success = false;
      packet.valid = false;
      packet.blockers.push({ code: 'readiness-not-ready', message: `Readiness assessment status is ${readinessAssessment.overallStatus}. It must be 'ready-for-backfill-design'.` });
    }
    if (readinessAssessment.written !== false) {
      packet.success = false;
      packet.valid = false;
      packet.blockers.push({ code: 'readiness-written', message: 'Readiness assessment indicates it has been written. Expected false.' });
    }
  }

  if (!backfillPlan && (!targets || !Array.isArray(targets) || targets.length === 0)) {
    packet.success = false;
    packet.valid = false;
    packet.blockers.push({ code: 'missing-plan-and-targets', message: 'Either backfillPlan or targets must be provided.' });
  }

  if (backfillPlan) {
    if (backfillPlan.written !== false) {
      packet.success = false;
      packet.valid = false;
      packet.blockers.push({ code: 'invalid-backfill-plan', message: 'Backfill plan indicates it has been written (written !== false).' });
    }
  }

  let effectivePlan = backfillPlan;

  if (!effectivePlan && targets) {
    // build a plan
    effectivePlan = buildProjectionBackfillPlan(
      { readinessAssessment, targets },
      { mode: options.mode, batchSize: options.batchSize }
    );
  }

  if (effectivePlan) {
    if (!effectivePlan.valid) {
      packet.success = false;
      packet.valid = false;
      packet.blockers.push({ code: 'invalid-backfill-plan', message: 'The provided or generated backfill plan is invalid.' });
      if (effectivePlan.blockers) {
        packet.blockers.push(...effectivePlan.blockers);
      }
    } else {
      packet.mode = effectivePlan.mode;
      packet.totalTargets = effectivePlan.totalTargets;
      packet.batchCount = effectivePlan.batchCount;

      packet.batches = effectivePlan.batches.map(batch => {
        const batchIndexStr = String(batch.batchIndex).padStart(3, '0');
        return {
          batchIndex: batch.batchIndex,
          targetCount: batch.targetCount,
          targets: batch.targets,
          expectedArtifactNames: {
            preReconciliationResponse: `batch-${batchIndexStr}-pre-reconciliation.json`,
            recomputeResponse: `batch-${batchIndexStr}-recompute-response.json`,
            postReconciliationResponse: `batch-${batchIndexStr}-post-reconciliation.json`,
            reconciliationReport: `batch-${batchIndexStr}-reconciliation-report.json`
          }
        };
      });

      if (effectivePlan.notes && effectivePlan.notes.length > 0) {
        packet.notes.push(...effectivePlan.notes);
      }
    }
  }

  if (notes && notes.length > 0) {
    packet.notes.push(...notes);
  }

  if (!packet.valid) {
    return {
      success: false,
      valid: false,
      packetType: 'projection-backfill-operation-packet',
      blockers: packet.blockers,
      written: false
    };
  }

  return packet;
}

/**
 * Formats a projection backfill operation packet.
 * @param {Object} packet
 * @param {Object} [options={}]
 * @param {boolean} [options.json=false]
 * @returns {string}
 */
export function formatProjectionBackfillOperationPacket(packet, options = {}) {
  if (options.json) {
    return JSON.stringify(packet, null, 2);
  }

  if (!packet.valid) {
    return `[INVALID PROJECTION BACKFILL OPERATION PACKET]
Blockers:
${packet.blockers.map(b => `- [${b.code}] ${b.message}`).join('\n')}
`;
  }

  let out = `[PROJECTION BACKFILL OPERATION PACKET]
Valid: true
Mode: ${packet.mode}
Environment: ${packet.environment}
${packet.operator ? `Operator: ${packet.operator}\n` : ''}CreatedAt: ${packet.createdAt}
Total Targets: ${packet.totalTargets}
Batch Count: ${packet.batchCount}

[SAFETY NOTE]
- This tool is purely local-only.
- It does not call Firebase.
- It does not perform writes.
- It does not perform backfill execution.
- It does not authorize UI read switching.
- Even manual-write-plan is only payload generation.

[WARNINGS]
${packet.warnings.map(w => `- [${w.code}] ${w.message}`).join('\n')}
`;

  out += `\n[VALIDATION CHECKLIST]\n`;
  for (const step of packet.validationChecklist) {
    out += `- [ ] ${step.step}: ${step.description}\n`;
  }

  if (packet.notes && packet.notes.length > 0) {
    out += `\n[NOTES]\n${packet.notes.map(n => `- ${n}`).join('\n')}\n`;
  }

  out += `\n[BATCHES]\n`;
  for (const batch of packet.batches) {
    out += `\nBatch ${batch.batchIndex} (${batch.targetCount} targets):\n`;
    out += `  Expected Artifacts:\n`;
    out += `    - pre-reconciliation: ${batch.expectedArtifactNames.preReconciliationResponse}\n`;
    out += `    - recompute response: ${batch.expectedArtifactNames.recomputeResponse}\n`;
    out += `    - post-reconciliation: ${batch.expectedArtifactNames.postReconciliationResponse}\n`;
    out += `    - reconciliation report: ${batch.expectedArtifactNames.reconciliationReport}\n`;
    out += `  Targets:\n`;
    for (const t of batch.targets) {
      out += `    - ${t.targetType} / ${t.targetId}\n`;
    }
  }

  return out;
}
