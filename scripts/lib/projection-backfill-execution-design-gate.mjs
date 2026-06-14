export function buildProjectionBackfillExecutionDesignGate(input, options = {}) {
  const {
    validationBundles,
    notes = [],
    environment = "unknown",
    operator
  } = input;

  const requireManualWriteEvidence = options.requireManualWriteEvidence !== false;
  const requiredTargetTypes = options.requiredTargetTypes || ["object", "marker", "place"];
  const allowDuplicateTargetEvidence = options.allowDuplicateTargetEvidence === true;

  const gate = {
    success: false,
    valid: false,
    gateType: "projection-backfill-execution-design-gate",
    overallStatus: "fail",
    environment,
    operator,
    bundleCount: 0,
    totalTargets: 0,
    manualWriteBundleCount: 0,
    dryRunBundleCount: 0,
    targetTypeCoverage: {},
    evidenceModes: [],
    blockers: [],
    warnings: [
      { code: "not-execution", message: "This gate does not execute backfill." },
      { code: "no-ui-switching", message: "This gate does not authorize UI read switching." },
      { code: "design-only", message: "The highest positive status is ready-for-execution-design." }
    ],
    notes: Array.isArray(notes) ? notes : [],
    written: false
  };

  // Initialize target coverage tracking
  for (const t of requiredTargetTypes) {
    gate.targetTypeCoverage[t] = {
      hasEvidence: false,
      hasManualWriteEvidence: false,
      targetCount: 0
    };
  }

  if (!validationBundles || !Array.isArray(validationBundles) || validationBundles.length === 0) {
    gate.blockers.push({ code: "missing-bundles", message: "validationBundles must be a non-empty array." });
    return gate;
  }

  gate.bundleCount = validationBundles.length;

  let hasFail = false;
  let hasBlocked = false;
  const seenTargets = new Set();
  const seenModes = new Set();

  for (let i = 0; i < validationBundles.length; i++) {
    const bundle = validationBundles[i];

    if (!bundle || typeof bundle !== "object") {
      gate.blockers.push({ code: "malformed-bundle", message: `Bundle at index ${i} is malformed.` });
      hasFail = true;
      continue;
    }

    if (bundle.bundleType !== "projection-backfill-operation-validation-bundle") {
      gate.blockers.push({ code: "invalid-bundle-type", message: `Bundle at index ${i} has invalid bundleType: ${bundle.bundleType}` });
      hasFail = true;
      continue;
    }

    if (bundle.valid !== true) {
      gate.blockers.push({ code: "invalid-bundle", message: `Bundle at index ${i} is marked invalid.` });
      hasFail = true;
      continue;
    }

    if (bundle.written !== false) {
      gate.blockers.push({ code: "bundle-written", message: `Bundle at index ${i} is unexpectedly marked written:true.` });
      hasFail = true;
      continue;
    }

    if (bundle.overallStatus === "fail") {
      gate.blockers.push({ code: "bundle-failed", message: `Bundle at index ${i} has overallStatus fail.` });
      hasFail = true;
      continue;
    }

    if (bundle.overallStatus === "blocked") {
      gate.blockers.push({ code: "bundle-blocked", message: `Bundle at index ${i} has overallStatus blocked.` });
      hasBlocked = true;
      continue;
    }

    if (bundle.overallStatus === "manual-write-evidence-pass") {
      gate.manualWriteBundleCount++;
      seenModes.add("manual-write-evidence-pass");
    } else if (bundle.overallStatus === "dry-run-evidence-pass") {
      gate.dryRunBundleCount++;
      seenModes.add("dry-run-evidence-pass");
    } else {
      gate.blockers.push({ code: "invalid-bundle-status", message: `Bundle at index ${i} has unrecognized positive status: ${bundle.overallStatus}` });
      hasFail = true;
      continue;
    }

    // Process targets in bundle batches
    if (Array.isArray(bundle.batches)) {
      for (const batch of bundle.batches) {
        if (Array.isArray(batch.targets)) {
          for (const target of batch.targets) {
            const key = `${target.targetType}:${target.targetId}`;

            if (seenTargets.has(key)) {
              if (!allowDuplicateTargetEvidence) {
                gate.blockers.push({ code: "duplicate-target-evidence", message: `Duplicate evidence for target ${key}` });
                hasBlocked = true;
              }
            } else {
              seenTargets.add(key);
              gate.totalTargets++;
            }

            if (!gate.targetTypeCoverage[target.targetType]) {
              gate.targetTypeCoverage[target.targetType] = { hasEvidence: false, hasManualWriteEvidence: false, targetCount: 0 };
            }

            gate.targetTypeCoverage[target.targetType].hasEvidence = true;
            if (bundle.overallStatus === "manual-write-evidence-pass") {
              gate.targetTypeCoverage[target.targetType].hasManualWriteEvidence = true;
            }
            gate.targetTypeCoverage[target.targetType].targetCount++;
          }
        }
      }
    }
  }

  gate.evidenceModes = Array.from(seenModes).sort();

  if (requireManualWriteEvidence && gate.manualWriteBundleCount === 0 && !hasFail) {
    gate.blockers.push({ code: "missing-manual-write-evidence", message: "requireManualWriteEvidence is true but no manual-write-evidence-pass bundle was found." });
    hasBlocked = true;
  }

  for (const t of requiredTargetTypes) {
    if (!gate.targetTypeCoverage[t] || !gate.targetTypeCoverage[t].hasEvidence) {
      gate.blockers.push({ code: "missing-target-coverage", message: `Missing evidence for required target type: ${t}` });
      hasBlocked = true;
    } else if (requireManualWriteEvidence && !gate.targetTypeCoverage[t].hasManualWriteEvidence) {
      gate.blockers.push({ code: "missing-manual-write-target-coverage", message: `requireManualWriteEvidence is true but missing manual-write evidence for required target type: ${t}` });
      hasBlocked = true;
    }
  }

  if (hasFail) {
    gate.overallStatus = "fail";
    gate.success = false;
    gate.valid = false;
  } else if (hasBlocked || gate.blockers.length > 0) {
    gate.overallStatus = "blocked";
    gate.success = false;
    gate.valid = false;
  } else {
    gate.overallStatus = "ready-for-execution-design";
    gate.success = true;
    gate.valid = true;
  }

  return gate;
}

export function formatProjectionBackfillExecutionDesignGate(gate, options = {}) {
  if (options.json) {
    return JSON.stringify(gate, null, 2);
  }

  const lines = [
    `Execution Design Gate Validity: ${gate.valid}`,
    `Overall Status: ${gate.overallStatus}`,
    `Environment: ${gate.environment}`
  ];

  if (gate.operator) {
    lines.push(`Operator: ${gate.operator}`);
  }

  lines.push(`Bundle Count: ${gate.bundleCount}`);
  lines.push(`Total Targets: ${gate.totalTargets}`);
  lines.push(`Manual Write Bundle Count: ${gate.manualWriteBundleCount}`);
  lines.push(`Dry Run Bundle Count: ${gate.dryRunBundleCount}`);

  lines.push('');
  lines.push('TARGET TYPE COVERAGE:');
  for (const [type, info] of Object.entries(gate.targetTypeCoverage)) {
    lines.push(`  - ${type}: hasEvidence=${info.hasEvidence}, hasManualWriteEvidence=${info.hasManualWriteEvidence}, targetCount=${info.targetCount}`);
  }

  if (gate.blockers.length > 0) {
    lines.push('');
    lines.push('BLOCKERS:');
    for (const b of gate.blockers) {
      lines.push(`  - [${b.code}] ${b.message}`);
    }
  }

  if (gate.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const w of gate.warnings) {
      lines.push(`  - [${w.code}] ${w.message}`);
    }
  }

  if (gate.notes.length > 0) {
    lines.push('');
    lines.push('NOTES:');
    for (const n of gate.notes) {
      lines.push(`  - ${n}`);
    }
  }

  lines.push('');
  lines.push('*** SAFETY NOTE ***');
  lines.push('- This tool is local-only.');
  lines.push('- It does not call Firebase.');
  lines.push('- It does not perform writes.');
  lines.push('- It does not execute backfill.');
  lines.push('- It does not authorize UI read switching.');
  lines.push('- ready-for-execution-design is not execution authorization.');

  return lines.join('\n');
}
