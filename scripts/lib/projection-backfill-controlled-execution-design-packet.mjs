export function buildProjectionBackfillControlledExecutionDesignPacket(input, options = {}) {
  const {
    executionDesignGate,
    operationValidationBundles,
    environment = "unknown",
    operator = "unknown",
    notes = []
  } = input;

  const validNotes = Array.isArray(notes) ? notes : [];
  const additionalHaltCriteria = Array.isArray(options.additionalHaltCriteria) ? options.additionalHaltCriteria : [];
  const additionalOperatorChecklistItems = Array.isArray(options.additionalOperatorChecklistItems) ? options.additionalOperatorChecklistItems : [];
  const additionalFutureExecutionRequirements = Array.isArray(options.additionalFutureExecutionRequirements) ? options.additionalFutureExecutionRequirements : [];

  const packet = {
    success: false,
    valid: false,
    packetType: "projection-backfill-controlled-execution-design-packet",
    overallStatus: "fail",
    environment: typeof environment === "string" && environment.trim() !== "" ? environment : "unknown",
    operator: typeof operator === "string" && operator.trim() !== "" ? operator : "unknown",
    sourceGateStatus: executionDesignGate?.overallStatus || "unknown",
    evidenceModes: [],
    bundleCount: 0,
    totalTargets: 0,
    targetTypeCoverage: {},
    executionAuthorization: false,
    written: false,
    executed: false,
    safetyBoundaries: [
      "local-only",
      "no Firebase auth",
      "no Cloud Functions call",
      "no Firestore write",
      "no deploy",
      "no actual backfill execution",
      "no UI read switching authorization"
    ],
    haltCriteria: [
      "validation bundle is fail or blocked",
      "duplicate target evidence exists",
      "target count mismatch occurs",
      "manual-write evidence mode does not have strictly equal post evidence",
      "any unexpected write or executed flag is true",
      ...additionalHaltCriteria
    ],
    rollbackPolicy: {
      strategy: "projection summaries are derived and rebuildable",
      invariants: [
        "do not delete Entities or Facts as rollback",
        "rollback means disabling future read switching / ignoring generated summaries / regenerating summaries from Facts",
        "rollback validation must be separately proven before UI read switching",
        "no rollback write is performed by this tool"
      ]
    },
    operatorChecklist: [
      "confirm all inputs are checked-in or uploaded as reviewed artifacts",
      "confirm target list is explicit",
      "confirm no collection scan is involved",
      "confirm design gate output is 'ready-for-execution-design'",
      "confirm this packet is not execution approval",
      "confirm future execution still requires separate explicit approval",
      ...additionalOperatorChecklistItems
    ],
    futureExecutionRequirements: [
      "actual backfill execution design",
      "UI read switching gate",
      ...additionalFutureExecutionRequirements
    ],
    blockers: [],
    warnings: [],
    notes: validNotes
  };

  // Validation
  let hasFail = false;
  let hasBlocked = false;

  if (!executionDesignGate || typeof executionDesignGate !== "object") {
    packet.blockers.push({ code: "missing-gate", message: "executionDesignGate is required and must be an object." });
    hasFail = true;
  } else {
    if (executionDesignGate.gateType !== "projection-backfill-execution-design-gate") {
      packet.blockers.push({ code: "invalid-gate-type", message: `executionDesignGate.gateType must be projection-backfill-execution-design-gate, got: ${executionDesignGate.gateType}` });
      hasFail = true;
    }
    if (executionDesignGate.valid !== true || executionDesignGate.success !== true) {
      packet.blockers.push({ code: "invalid-gate-state", message: "executionDesignGate must have valid:true and success:true." });
      hasFail = true;
    }
    if (executionDesignGate.overallStatus !== "ready-for-execution-design") {
      packet.blockers.push({ code: "invalid-gate-status", message: `executionDesignGate.overallStatus must be ready-for-execution-design, got: ${executionDesignGate.overallStatus}` });
      hasBlocked = true; // Overall fail but logically blocked by previous step
      hasFail = true;
    }
    if (executionDesignGate.written !== false) {
      packet.blockers.push({ code: "gate-written", message: "executionDesignGate.written must be false." });
      hasFail = true;
    }
    if (executionDesignGate.executed === true) {
      packet.blockers.push({ code: "gate-executed", message: "executionDesignGate.executed must not be true." });
      hasFail = true;
    }
    if (executionDesignGate.executionAuthorization === true) {
      packet.blockers.push({ code: "gate-execution-authorization", message: "executionDesignGate.executionAuthorization must not be true." });
      hasFail = true;
    }
  }

  // To support legacy input naming if someone missed it, we handle singular fallback just in case
  let bundlesToProcess = operationValidationBundles;
  if (!bundlesToProcess && input.operationValidationBundle) {
    bundlesToProcess = [input.operationValidationBundle];
  }

  if (!bundlesToProcess || !Array.isArray(bundlesToProcess) || bundlesToProcess.length === 0) {
    packet.blockers.push({ code: "missing-bundles", message: "operationValidationBundles is required and must be a non-empty array." });
    hasFail = true;
  } else {
    packet.bundleCount = bundlesToProcess.length;
    const seenModes = new Set();
    const seenTargets = new Set();

    for (let i = 0; i < bundlesToProcess.length; i++) {
      const bundle = bundlesToProcess[i];

      if (!bundle || typeof bundle !== "object") {
        packet.blockers.push({ code: "malformed-bundle", message: `Bundle at index ${i} is malformed.` });
        hasFail = true;
        continue;
      }

      if (bundle.bundleType !== "projection-backfill-operation-validation-bundle") {
        packet.blockers.push({ code: "invalid-bundle-type", message: `Bundle at index ${i} has invalid bundleType: ${bundle.bundleType}` });
        hasFail = true;
        continue;
      }

      if (bundle.valid !== true || bundle.success !== true) {
        packet.blockers.push({ code: "invalid-bundle", message: `Bundle at index ${i} is marked invalid or unsuccessful.` });
        hasFail = true;
        continue;
      }

      if (bundle.written !== false) {
        packet.blockers.push({ code: "bundle-written", message: `Bundle at index ${i} is unexpectedly marked written:true.` });
        hasFail = true;
        continue;
      }

      if (bundle.executed === true) {
        packet.blockers.push({ code: "bundle-executed", message: `Bundle at index ${i} is unexpectedly marked executed:true.` });
        hasFail = true;
        continue;
      }

      if (bundle.executionAuthorization === true) {
        packet.blockers.push({ code: "bundle-execution-authorization", message: `Bundle at index ${i} is unexpectedly marked executionAuthorization:true.` });
        hasFail = true;
        continue;
      }

      if (bundle.overallStatus === "fail") {
        packet.blockers.push({ code: "bundle-fail", message: `Bundle at index ${i} overallStatus is fail.` });
        hasFail = true;
        continue;
      }
      if (bundle.overallStatus === "blocked") {
        packet.blockers.push({ code: "bundle-blocked", message: `Bundle at index ${i} overallStatus is blocked.` });
        hasBlocked = true;
        continue;
      }

      if (bundle.overallStatus === "dry-run-evidence-pass" || bundle.overallStatus === "manual-write-evidence-pass") {
        seenModes.add(bundle.overallStatus);
      } else {
        packet.blockers.push({ code: "invalid-bundle-status", message: `Bundle at index ${i} has unrecognized positive status: ${bundle.overallStatus}` });
        hasFail = true;
        continue;
      }

      if (Array.isArray(bundle.batches)) {
        for (const batch of bundle.batches) {
          if (Array.isArray(batch.targets)) {
            for (const target of batch.targets) {
              const key = `${target.targetType}:${target.targetId}`;
              if (!seenTargets.has(key)) {
                seenTargets.add(key);
                packet.totalTargets++;

                if (!packet.targetTypeCoverage[target.targetType]) {
                packet.targetTypeCoverage[target.targetType] = { targetCount: 0, hasManualWriteEvidence: false };
              }
              packet.targetTypeCoverage[target.targetType].targetCount++;
              if (bundle.overallStatus === "manual-write-evidence-pass") {
                packet.targetTypeCoverage[target.targetType].hasManualWriteEvidence = true;
              }
              } else {
                packet.blockers.push({ code: "duplicate-target-evidence", message: `Duplicate evidence for target ${key}` });
                hasBlocked = true;
              }
            }
          }
        }
      }
    }


    packet.evidenceModes = Array.from(seenModes).sort();

    if (Object.keys(packet.targetTypeCoverage).length === 0 && !hasFail) {
      packet.blockers.push({ code: "empty-target-coverage", message: "Target coverage is empty. No valid targets found in the operation validation bundles." });
      hasBlocked = true;
    } else if (executionDesignGate) {
      // Cross-reference derived packet data with what the gate explicitly approved
      if (executionDesignGate.bundleCount !== packet.bundleCount) {
         packet.blockers.push({ code: "gate-bundle-count-mismatch", message: `Gate approved ${executionDesignGate.bundleCount} bundles, but received ${packet.bundleCount}.` });
         hasFail = true;
      }
      if (executionDesignGate.totalTargets !== packet.totalTargets) {
         packet.blockers.push({ code: "gate-target-count-mismatch", message: `Gate approved ${executionDesignGate.totalTargets} targets, but received ${packet.totalTargets}.` });
         hasFail = true;
      }

      const gateModes = [...(executionDesignGate.evidenceModes || [])].sort().join(',');
      const packetModes = [...packet.evidenceModes].sort().join(',');
      if (gateModes !== packetModes) {
         packet.blockers.push({ code: "gate-evidence-modes-mismatch", message: `Gate approved modes [${gateModes}], but received [${packetModes}].` });
         hasFail = true;
      }

      if (executionDesignGate.targetTypeCoverage) {
        for (const [type, info] of Object.entries(executionDesignGate.targetTypeCoverage)) {
           const packetTypeCount = packet.targetTypeCoverage[type] ? packet.targetTypeCoverage[type].targetCount : 0;
           if (info.targetCount !== packetTypeCount) {
              packet.blockers.push({ code: "gate-target-coverage-mismatch", message: `Gate approved ${info.targetCount} ${type} targets, but received ${packetTypeCount}.` });
              hasFail = true;
           }
           const packetHasManual = packet.targetTypeCoverage[type] ? (packet.targetTypeCoverage[type].hasManualWriteEvidence === true) : false;
           if (info.hasManualWriteEvidence !== packetHasManual) {
              packet.blockers.push({ code: "gate-manual-write-coverage-mismatch", message: `Gate required hasManualWriteEvidence=${info.hasManualWriteEvidence} for ${type}, but received ${packetHasManual}.` });
              hasFail = true;
           }
        }
        for (const type of Object.keys(packet.targetTypeCoverage)) {
           if (!executionDesignGate.targetTypeCoverage[type]) {
              packet.blockers.push({ code: "gate-target-coverage-mismatch", message: `Gate did not approve ${type} targets, but bundle provided them.` });
              hasFail = true;
           }
        }
      }
    }
  }

  if (hasFail) {
    packet.overallStatus = "fail";
    packet.success = false;
    packet.valid = false;
  } else if (hasBlocked || packet.blockers.length > 0) {
    packet.overallStatus = "blocked";
    packet.success = false;
    packet.valid = false;
  } else {
    packet.overallStatus = "ready-for-controlled-execution-design-review";
    packet.success = true;
    packet.valid = true;
  }

  return packet;
}

export function formatProjectionBackfillControlledExecutionDesignPacket(packet, options = {}) {
  if (options.json) {
    return JSON.stringify(packet, null, 2);
  }

  const lines = [
    `Execution Design Packet Validity: ${packet.valid}`,
    `Overall Status: ${packet.overallStatus}`,
    `Environment: ${packet.environment}`,
    `Operator: ${packet.operator}`,
    `Source Gate Status: ${packet.sourceGateStatus}`,
    `Evidence Modes: ${packet.evidenceModes.join(', ')}`,
    `Bundle Count: ${packet.bundleCount}`,
    `Total Targets: ${packet.totalTargets}`
  ];

  lines.push('');
  lines.push('TARGET TYPE COVERAGE:');
  for (const [type, info] of Object.entries(packet.targetTypeCoverage)) {
    lines.push(`  - ${type}: targetCount=${info.targetCount}`);
  }

  if (packet.blockers.length > 0) {
    lines.push('');
    lines.push('BLOCKERS:');
    for (const b of packet.blockers) {
      lines.push(`  - [${b.code}] ${b.message}`);
    }
  }

  if (packet.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const w of packet.warnings) {
      lines.push(`  - [${w.code}] ${w.message}`);
    }
  }

  if (packet.notes.length > 0) {
    lines.push('');
    lines.push('NOTES:');
    for (const n of packet.notes) {
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
  lines.push('- ready-for-controlled-execution-design-review is NOT execution authorization.');
  lines.push(`- executionAuthorization: ${packet.executionAuthorization}`);
  lines.push(`- written: ${packet.written}`);
  lines.push(`- executed: ${packet.executed}`);

  return lines.join('\n');
}
