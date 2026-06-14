/**
 * Helper for validating projection backfill operation evidence locally.
 * This is a pure helper and does not depend on Firebase or specific environments.
 */

import { buildProjectionReconciliationReport, parseCallableResultEnvelope } from './projection-reconciliation-report.mjs';

/**
 * Builds a projection backfill operation validation bundle.
 * @param {Object} input
 * @param {Object} input.operationPacket The operation packet JSON
 * @param {Array<Object>} input.batches Array of batch evidence objects
 * @param {string[]} [input.notes] Optional notes
 * @param {Object} [options={}]
 * @returns {Object}
 */
export function buildProjectionBackfillOperationValidationBundle(input, options = {}) {
  const { operationPacket, batches = [], notes = [] } = input || {};

  const bundle = {
    success: true,
    valid: true,
    bundleType: "projection-backfill-operation-validation-bundle",
    mode: "dryRun",
    overallStatus: "blocked",
    packetType: "projection-backfill-operation-packet",
    totalTargets: 0,
    batchCount: 0,
    validatedBatchCount: 0,
    recomputeResponseCount: 0,
    batches: [],
    blockers: [],
    warnings: [
      {
        code: "not-execution",
        message: "This validation bundle does not execute backfill."
      },
      {
        code: "no-ui-switching",
        message: "This validation bundle does not authorize UI read switching."
      }
    ],
    notes: [],
    written: false
  };

  if (notes && Array.isArray(notes)) {
    bundle.notes.push(...notes);
  }

  // 1. Packet validation
  if (!operationPacket) {
    return markFail(bundle, 'missing-packet', 'operationPacket is required.');
  }

  if (operationPacket.packetType !== 'projection-backfill-operation-packet') {
    return markFail(bundle, 'invalid-packet-type', `Packet type must be 'projection-backfill-operation-packet', got '${operationPacket.packetType}'.`);
  }

  if (operationPacket.valid !== true) {
    return markFail(bundle, 'invalid-packet', 'Operation packet is marked as invalid.');
  }

  if (operationPacket.written !== false) {
    return markFail(bundle, 'invalid-packet-written', 'Operation packet indicates it has been written (written !== false).');
  }

  if (operationPacket.mode !== 'dryRun' && operationPacket.mode !== 'manual-write-plan') {
    return markFail(bundle, 'invalid-mode', `Mode must be 'dryRun' or 'manual-write-plan', got '${operationPacket.mode}'.`);
  }

  if (!Array.isArray(operationPacket.batches) || operationPacket.batches.length === 0) {
    return markFail(bundle, 'missing-packet-batches', 'Operation packet must have at least one batch.');
  }

  bundle.mode = operationPacket.mode;
  bundle.totalTargets = operationPacket.totalTargets;
  bundle.batchCount = operationPacket.batches.length;

  // 2. Batches evidence input shape validation
  if (!Array.isArray(batches)) {
    return markFail(bundle, 'invalid-batches-input', 'Input batches must be an array.');
  }

  const packetBatchesMap = new Map();
  for (const pb of operationPacket.batches) {
    packetBatchesMap.set(pb.batchIndex, pb);
  }

  const inputBatchesMap = new Map();
  for (const ib of batches) {
    if (typeof ib.batchIndex !== 'number') {
      return markFail(bundle, 'invalid-batch-index', 'Batch evidence must have a batchIndex.');
    }
    if (inputBatchesMap.has(ib.batchIndex)) {
      return markFail(bundle, 'duplicate-batch-evidence', `Duplicate batch evidence for batchIndex ${ib.batchIndex}.`);
    }
    inputBatchesMap.set(ib.batchIndex, ib);
  }

  // Check for missing or extra batches
  for (const batchIndex of packetBatchesMap.keys()) {
    if (!inputBatchesMap.has(batchIndex)) {
      return markFail(bundle, 'missing-batch-evidence', `Missing evidence for batchIndex ${batchIndex}.`);
    }
  }

  for (const batchIndex of inputBatchesMap.keys()) {
    if (!packetBatchesMap.has(batchIndex)) {
      return markFail(bundle, 'extra-batch-evidence', `Extra evidence provided for batchIndex ${batchIndex} not in packet.`);
    }
  }

  // 3. Validate each batch
  let allEqual = true;
  let validationBlocked = false;

  for (const packetBatch of operationPacket.batches) {
    const batchIndex = packetBatch.batchIndex;
    const evidenceBatch = inputBatchesMap.get(batchIndex);
    const packetTargets = packetBatch.targets || [];

    const validatedBatch = {
      batchIndex: batchIndex,
      targetCount: packetTargets.length,
      recomputeValidatedCount: 0,
      preReconciliationStatus: 'unknown',
      postReconciliationStatus: 'unknown',
      reportStatus: 'unknown',
      targets: [],
      blockers: [],
      warnings: []
    };
    bundle.batches.push(validatedBatch);

    const packetTargetMap = new Map();
    for (const t of packetTargets) {
      packetTargetMap.set(`${t.targetType}:${t.targetId}`, t);
    }

    // A. Recompute Responses Validation
    const recomputeResponses = evidenceBatch.recomputeResponses || [];
    const recomputeMap = new Map();

    for (const rawResp of recomputeResponses) {
      try {
        const resp = parseCallableResultEnvelope(rawResp);
        if (!resp || !resp.targetType || !resp.targetId) {
           addBlocker(validatedBatch, 'invalid-recompute-response', 'Recompute response missing targetType or targetId.');
           validationBlocked = true;
           continue;
        }

        const key = `${resp.targetType}:${resp.targetId}`;
        if (recomputeMap.has(key)) {
           addBlocker(validatedBatch, 'duplicate-recompute-response', `Duplicate recompute response for ${key}.`);
           validationBlocked = true;
           continue;
        }

        if (!packetTargetMap.has(key)) {
           addBlocker(validatedBatch, 'mismatched-recompute-target', `Recompute response for ${key} does not match any target in packet batch.`);
           validationBlocked = true;
           continue;
        }

        recomputeMap.set(key, resp);
      } catch (e) {
        addBlocker(validatedBatch, 'invalid-recompute-response', `Could not parse recompute response: ${e.message}`);
        validationBlocked = true;
      }
    }

    for (const [key, pt] of packetTargetMap.entries()) {
      const resp = recomputeMap.get(key);
      const valTarget = {
        targetType: pt.targetType,
        targetId: pt.targetId,
        summaryPath: pt.summaryPath || 'unknown',
        recomputeStatus: 'unknown',
        postStatus: 'unknown'
      };
      validatedBatch.targets.push(valTarget);

      if (!resp) {
        addBlocker(validatedBatch, 'missing-recompute-response', `Missing recompute response for ${key}.`);
        validationBlocked = true;
        continue;
      }

      if (resp.success !== true) {
         addBlocker(validatedBatch, 'failed-recompute-response', `Recompute response failed for ${key}.`);
         validationBlocked = true;
         valTarget.recomputeStatus = 'failed';
         continue;
      }

      if (bundle.mode === 'dryRun') {
        if (resp.dryRun !== true) {
           addBlocker(validatedBatch, 'dryrun-mismatch', `Recompute response for ${key} must have dryRun=true in dryRun mode.`);
           validationBlocked = true;
           continue;
        }
        if (resp.written !== false) {
           addBlocker(validatedBatch, 'written-mismatch', `Recompute response for ${key} must have written=false in dryRun mode.`);
           validationBlocked = true;
           continue;
        }
      } else if (bundle.mode === 'manual-write-plan') {
        if (resp.dryRun !== false) {
           addBlocker(validatedBatch, 'dryrun-mismatch', `Recompute response for ${key} must have dryRun=false in manual-write-plan mode.`);
           validationBlocked = true;
           continue;
        }
        if (resp.written !== true) {
           addBlocker(validatedBatch, 'written-mismatch', `Recompute response for ${key} must have written=true in manual-write-plan mode.`);
           validationBlocked = true;
           continue;
        }
      }

      valTarget.recomputeStatus = 'validated';
      validatedBatch.recomputeValidatedCount++;
      bundle.recomputeResponseCount++;
    }

    // B. Pre-Reconciliation Context Validation
    if (bundle.mode === 'manual-write-plan' && !evidenceBatch.preReconciliationResponse) {
       addBlocker(validatedBatch, 'missing-pre-evidence', 'manual-write-plan requires preReconciliationResponse evidence.');
       validationBlocked = true;
    }

    if (evidenceBatch.preReconciliationResponse) {
       try {
         const preReport = normalizeReport(evidenceBatch.preReconciliationResponse);
         validatedBatch.preReconciliationStatus = preReport.overallStatus;

         if (preReport.success === false || preReport.overallStatus === 'fail') {
            addBlocker(validatedBatch, 'failed-pre-report', 'Pre-reconciliation report has success=false or overallStatus=fail.');
            validationBlocked = true;
         }

         if (preReport.countMismatch) {
            addBlocker(validatedBatch, 'pre-count-mismatch', 'Pre-reconciliation report has a count mismatch.');
            validationBlocked = true;
         }

         const preTargetMap = new Map();
         for (const t of preReport.targets) {
            const key = `${t.targetType}:${t.targetId}`;
            if (preTargetMap.has(key)) {
                addBlocker(validatedBatch, 'pre-duplicate-target', `Duplicate target ${key} in pre-reconciliation report.`);
                validationBlocked = true;
            }
            preTargetMap.set(key, t);
         }

         for (const [key, pt] of packetTargetMap.entries()) {
           if (!preTargetMap.has(key)) {
               addBlocker(validatedBatch, 'pre-missing-target', `Missing target ${key} in pre-reconciliation report.`);
               validationBlocked = true;
           }
         }

         for (const key of preTargetMap.keys()) {
           if (!packetTargetMap.has(key)) {
               addBlocker(validatedBatch, 'pre-extra-target', `Extra target ${key} in pre-reconciliation report.`);
               validationBlocked = true;
           }
         }

         if (preReport.overallStatus === 'attention' || preReport.computedCounts.different > 0) {
            validatedBatch.warnings.push({ code: 'pre-reconciliation-attention', message: 'Pre-reconciliation found differences or missing summaries. This is expected context.' });
         }

       } catch(e) {
          addBlocker(validatedBatch, 'invalid-pre-report', `Could not process preReconciliationResponse: ${e.message}`);
          validationBlocked = true;
       }
    } else {
       validatedBatch.preReconciliationStatus = 'context';
    }


    // C. Post-Reconciliation / Report Validation
    const hasPost = !!evidenceBatch.postReconciliationResponse;
    const hasReport = !!evidenceBatch.reconciliationReport;

    if (bundle.mode === 'manual-write-plan' && !hasPost && !hasReport) {
      addBlocker(validatedBatch, 'missing-post-evidence', 'manual-write-plan requires postReconciliationResponse or reconciliationReport evidence.');
      validationBlocked = true;
    }

    let parsedPost = null;
    let parsedReport = null;

    if (hasPost) {
       try {
         parsedPost = normalizeReport(evidenceBatch.postReconciliationResponse);
         validatedBatch.postReconciliationStatus = parsedPost.overallStatus;
         checkReportMatchesPacket(parsedPost, packetTargetMap, validatedBatch, 'post');
       } catch(e) {
          addBlocker(validatedBatch, 'invalid-post-report', `Could not process postReconciliationResponse: ${e.message}`);
          validationBlocked = true;
       }
    }

    if (hasReport) {
      try {
         parsedReport = normalizeReport(evidenceBatch.reconciliationReport);
         validatedBatch.reportStatus = parsedReport.overallStatus;
         checkReportMatchesPacket(parsedReport, packetTargetMap, validatedBatch, 'report');
      } catch(e) {
         addBlocker(validatedBatch, 'invalid-reconciliation-report', `Could not process reconciliationReport: ${e.message}`);
         validationBlocked = true;
      }
    }

    const postTargetMap = new Map();
    if (parsedPost) {
       for (const t of parsedPost.targets) {
          postTargetMap.set(`${t.targetType}:${t.targetId}`, t);
       }
    }

    const reportTargetMap = new Map();
    if (parsedReport) {
       for (const t of parsedReport.targets) {
          reportTargetMap.set(`${t.targetType}:${t.targetId}`, t);
       }
    }

    for (const vt of validatedBatch.targets) {
       const key = `${vt.targetType}:${vt.targetId}`;
       const pt = postTargetMap.get(key);
       const rt = reportTargetMap.get(key);

       let effectiveStatus = null;

       if (pt && rt) {
          if (pt.status !== rt.status) {
             addBlocker(validatedBatch, 'post-report-status-mismatch', `Post reconciliation response and reconciliation report disagree for target ${key}.`);
             validationBlocked = true;
          }
          effectiveStatus = pt.status;
       } else if (pt) {
          effectiveStatus = pt.status;
       } else if (rt) {
          effectiveStatus = rt.status;
       }

       if (effectiveStatus) {
          vt.postStatus = effectiveStatus;
          if (effectiveStatus !== 'equal') {
             allEqual = false;
             if (bundle.mode === 'manual-write-plan') {
                addBlocker(validatedBatch, 'post-target-not-equal', `Target ${key} is not equal in post evidence (${effectiveStatus}).`);
                validationBlocked = true;
             } else {
                validatedBatch.warnings.push({ code: 'post-target-not-equal', message: `Target ${key} is not equal in dryRun post evidence (${effectiveStatus}).` });
             }
          }
       }
    }

    if (validatedBatch.blockers.length === 0) {
      bundle.validatedBatchCount++;
    } else {
      bundle.blockers.push(...validatedBatch.blockers);
    }
    bundle.warnings.push(...validatedBatch.warnings);
  }

  // 4. Overall Status Determination
  if (bundle.blockers.length > 0) {
     if (bundle.blockers.some(b =>
       b.code.startsWith('invalid-') ||
       b.code === 'duplicate-batch-evidence' ||
       b.code.includes('count-mismatch') ||
       b.code.includes('extra-target') ||
       b.code.includes('duplicate-target')
     )) {
       bundle.overallStatus = 'fail';
       bundle.success = false;
       bundle.valid = false;
     } else {
       bundle.overallStatus = 'blocked';
       bundle.success = false;
       bundle.valid = false;
     }
  } else if (!validationBlocked) {
     if (bundle.mode === 'dryRun') {
        bundle.overallStatus = 'dry-run-evidence-pass';
     } else if (bundle.mode === 'manual-write-plan') {
        if (allEqual) {
          bundle.overallStatus = 'manual-write-evidence-pass';
        } else {
          bundle.overallStatus = 'blocked';
          bundle.success = false;
          bundle.valid = false;
        }
     }
  }

  return bundle;
}


function markFail(bundle, code, message) {
  bundle.success = false;
  bundle.valid = false;
  bundle.overallStatus = 'fail';
  bundle.blockers.push({ code, message });
  return bundle;
}

function addBlocker(validatedBatch, code, message) {
  validatedBatch.blockers.push({ code, message });
}

function normalizeReport(evidence) {
  if (!evidence || typeof evidence !== 'object') {
     throw new Error('Evidence is missing or not an object');
  }

  if (Array.isArray(evidence.targets) && evidence.computedCounts && typeof evidence.computedCounts === 'object') {
     return evidence;
  }

  return buildProjectionReconciliationReport(evidence);
}

function checkReportMatchesPacket(report, packetTargetMap, validatedBatch, prefix) {
  if (report.success === false || report.overallStatus === 'fail') {
     addBlocker(validatedBatch, `${prefix}-failed-report`, `${prefix} report has success=false or overallStatus=fail.`);
  }

  if (report.countMismatch) {
     addBlocker(validatedBatch, `${prefix}-count-mismatch`, `${prefix} report has a count mismatch.`);
  }

  const reportTargetMap = new Map();
  for (const t of report.targets) {
    const key = `${t.targetType}:${t.targetId}`;
    if (reportTargetMap.has(key)) {
       addBlocker(validatedBatch, `${prefix}-duplicate-target`, `Duplicate target ${key} in ${prefix} report.`);
    }
    reportTargetMap.set(key, t);
  }

  for (const [key, pt] of packetTargetMap.entries()) {
    if (!reportTargetMap.has(key)) {
       addBlocker(validatedBatch, `${prefix}-missing-target`, `Missing target ${key} in ${prefix} report.`);
    }
  }

  for (const key of reportTargetMap.keys()) {
    if (!packetTargetMap.has(key)) {
       addBlocker(validatedBatch, `${prefix}-extra-target`, `Extra target ${key} in ${prefix} report.`);
    }
  }
}

/**
 * Formats a projection backfill operation validation bundle for output.
 * @param {any} bundle
 * @param {{ json?: boolean }} options
 * @returns {string}
 */
export function formatProjectionBackfillOperationValidationBundle(bundle, options = {}) {
  if (options.json) {
    return JSON.stringify(bundle, null, 2);
  }

  const lines = [
    `Validation Bundle Validity: ${bundle.valid}`,
    `Overall Status: ${bundle.overallStatus}`,
    `Mode: ${bundle.mode}`,
    `Total Targets: ${bundle.totalTargets}`,
    `Batch Count: ${bundle.batchCount}`,
    `Validated Batch Count: ${bundle.validatedBatchCount}`,
    `Recompute Response Count: ${bundle.recomputeResponseCount}`
  ];

  if (bundle.notes.length > 0) {
    lines.push('');
    lines.push('NOTES:');
    for (const note of bundle.notes) {
      lines.push(`- ${note}`);
    }
  }

  if (bundle.blockers.length > 0) {
    lines.push('');
    lines.push('BLOCKERS:');
    for (const blocker of bundle.blockers) {
      lines.push(`- [${blocker.code}] ${blocker.message}`);
    }
  }

  if (bundle.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const warning of bundle.warnings) {
      lines.push(`- [${warning.code}] ${warning.message}`);
    }
  }

  if (bundle.batches.length > 0) {
    lines.push('');
    lines.push('BATCHES:');
    for (const batch of bundle.batches) {
      lines.push(`\n  Batch ${batch.batchIndex} (Targets: ${batch.targetCount}, Recompute Validated: ${batch.recomputeValidatedCount})`);
      lines.push(`  Pre-Reconciliation Status: ${batch.preReconciliationStatus}`);
      lines.push(`  Post-Reconciliation Status: ${batch.postReconciliationStatus}`);
      lines.push(`  Report Status: ${batch.reportStatus}`);

      if (batch.blockers.length > 0) {
        lines.push(`  Batch Blockers:`);
        for (const b of batch.blockers) {
           lines.push(`    - [${b.code}] ${b.message}`);
        }
      }

      if (batch.warnings.length > 0) {
        lines.push(`  Batch Warnings:`);
        for (const w of batch.warnings) {
           lines.push(`    - [${w.code}] ${w.message}`);
        }
      }

      lines.push(`  Targets:`);
      for (const t of batch.targets) {
        lines.push(`    - ${t.targetType} / ${t.targetId} (${t.summaryPath}) | Recompute: ${t.recomputeStatus} | Post: ${t.postStatus}`);
      }
    }
  }

  lines.push('');
  lines.push('*** SAFETY NOTE ***');
  lines.push('- This tool is local-only.');
  lines.push('- It does not call Firebase.');
  lines.push('- It does not perform writes.');
  lines.push('- It does not perform backfill execution.');
  lines.push('- It does not authorize UI read switching.');
  lines.push('- Validation evidence is not a UI read-switching gate.');

  return lines.join('\n');
}
