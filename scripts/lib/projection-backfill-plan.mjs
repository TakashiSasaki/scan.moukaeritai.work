export function buildProjectionBackfillPlan(input, options = {}) {
  if (!input || typeof input !== 'object') {
    return {
      success: false,
      valid: false,
      blockers: [{ code: 'invalid-input', message: 'Input must be an object.' }],
      written: false
    };
  }

  const { readinessAssessment, targets, notes = [] } = input;
  const batchSize = options.batchSize !== undefined ? options.batchSize : 20;
  const mode = options.mode || "dryRun";

  const blockers = [];

  if (typeof batchSize !== 'number' || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) {
    blockers.push({ code: "invalid-batch-size", message: "batchSize must be an integer between 1 and 20." });
  }

  if (mode !== "dryRun" && mode !== "manual-write-plan") {
    blockers.push({ code: "invalid-mode", message: "mode must be either 'dryRun' or 'manual-write-plan'." });
  }

  if (!readinessAssessment) {
    blockers.push({ code: "missing-readiness", message: "readinessAssessment is missing." });
  } else if (readinessAssessment.overallStatus !== "ready-for-backfill-design") {
    blockers.push({ code: "readiness-not-ready", message: `Readiness assessment status is ${readinessAssessment.overallStatus}. It must be 'ready-for-backfill-design'.` });
  } else if (readinessAssessment.written !== false) {
    blockers.push({ code: "readiness-written", message: "Readiness assessment indicates it has been written. Expected false." });
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    blockers.push({ code: "invalid-targets", message: "targets must be a non-empty array." });
  }

  const validTargetTypes = new Set(["object", "marker", "place"]);
  const seenTargets = new Set();
  const processedTargets = [];
  const targetBlockers = [];

  if (Array.isArray(targets)) {
    for (const target of targets) {
      if (!target.targetType || !validTargetTypes.has(target.targetType)) {
        targetBlockers.push({ code: "invalid-target-type", message: `Invalid targetType: ${target.targetType}` });
        continue;
      }
      if (!target.targetId || typeof target.targetId !== "string" || target.targetId.trim() === "") {
        targetBlockers.push({ code: "invalid-target-id", message: "Target ID must be a non-empty string." });
        continue;
      }
      if (target.targetId.trim() !== target.targetId) {
        targetBlockers.push({ code: "invalid-target-id", message: "Target ID cannot have leading or trailing whitespace." });
        continue;
      }
      if (target.targetId.includes("/")) {
        targetBlockers.push({ code: "invalid-target-id", message: `Target ID cannot contain slashes: ${target.targetId}` });
        continue;
      }

      const key = `${target.targetType}:${target.targetId}`;
      if (seenTargets.has(key)) {
        targetBlockers.push({ code: "duplicate-target", message: `Duplicate target: ${key}` });
      } else {
        seenTargets.add(key);
        processedTargets.push(target);
      }
    }
  }

  blockers.push(...targetBlockers);

  if (blockers.length > 0) {
    return {
      success: false,
      valid: false,
      blockers,
      written: false
    };
  }

  const batches = [];
  const isDryRun = mode === "dryRun";

  for (let i = 0; i < processedTargets.length; i += batchSize) {
    const batchTargets = processedTargets.slice(i, i + batchSize);

    batches.push({
      batchIndex: batches.length,
      targetCount: batchTargets.length,
      targets: batchTargets.map(t => {
        const summaryPath = t.summaryPath || `${t.targetType}Summaries/${t.targetId}`;
        return {
          targetType: t.targetType,
          targetId: t.targetId,
          summaryPath,
          recomputePayload: {
            data: {
              targetType: t.targetType,
              targetId: t.targetId,
              dryRun: isDryRun
            }
          }
        };
      })
    });
  }

  return {
    success: true,
    valid: true,
    mode,
    batchSize,
    totalTargets: processedTargets.length,
    batchCount: batches.length,
    batches,
    blockers: [],
    warnings: [
      {
        code: "not-execution",
        message: "This plan does not execute backfill."
      }
    ],
    notes,
    written: false
  };
}

export function formatProjectionBackfillPlan(plan, options = {}) {
  if (options.json) {
    return JSON.stringify(plan, null, 2);
  }

  if (!plan.valid) {
    return `[INVALID BACKFILL PLAN]
Blockers:
${plan.blockers.map(b => `- [${b.code}] ${b.message}`).join("\n")}
`;
  }

  let out = `[PROJECTION BACKFILL PLAN]
Valid: true
Mode: ${plan.mode}
Batch Size: ${plan.batchSize}
Total Targets: ${plan.totalTargets}
Batch Count: ${plan.batchCount}

[SAFETY NOTE]
- This tool is local-only.
- It does not call Firebase.
- It does not perform writes.
- It does not perform backfill execution.
- It does not authorize UI read switching.
- Even manual-write-plan is only payload generation.

Warnings:
${plan.warnings.map(w => `- [${w.code}] ${w.message}`).join("\n")}
`;

  if (plan.notes && plan.notes.length > 0) {
    out += `\nNotes:\n${plan.notes.map(n => `- ${n}`).join("\n")}\n`;
  }

  out += `\nBatches:\n`;
  for (const batch of plan.batches) {
    out += `\nBatch ${batch.batchIndex} (${batch.targetCount} targets):\n`;
    for (const t of batch.targets) {
      out += `  - ${t.targetType} / ${t.targetId}\n`;
    }
  }

  return out;
}
