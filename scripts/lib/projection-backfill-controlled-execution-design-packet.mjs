export function buildProjectionBackfillControlledExecutionDesignPacket(input, options = {}) {
  const {
    executionDesignGate,
    operationValidationBundle,
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
    if (executionDesignGate.overallStatus !== "ready-for-execution-design") {
      packet.blockers.push({ code: "invalid-gate-status", message: `executionDesignGate.overallStatus must be ready-for-execution-design, got: ${executionDesignGate.overallStatus}` });
      hasBlocked = true; // Overall fail but logically blocked by previous step
      hasFail = true;
    }
    if (executionDesignGate.written !== false) {
      packet.blockers.push({ code: "gate-written", message: "executionDesignGate.written must be false." });
      hasFail = true;
    }
  }

  if (!operationValidationBundle || typeof operationValidationBundle !== "object") {
    packet.blockers.push({ code: "missing-bundle", message: "operationValidationBundle is required and must be an object." });
    hasFail = true;
  } else {
    if (operationValidationBundle.written !== false) {
      packet.blockers.push({ code: "bundle-written", message: "operationValidationBundle.written must be false." });
      hasFail = true;
    }
    if (operationValidationBundle.overallStatus === "fail") {
      packet.blockers.push({ code: "bundle-fail", message: "operationValidationBundle overallStatus is fail." });
      hasFail = true;
    }
    if (operationValidationBundle.overallStatus === "blocked") {
      packet.blockers.push({ code: "bundle-blocked", message: "operationValidationBundle overallStatus is blocked." });
      hasBlocked = true;
    }

    if (operationValidationBundle.overallStatus && operationValidationBundle.overallStatus.includes("pass")) {
      packet.evidenceModes.push(operationValidationBundle.overallStatus);
    }
  }

  // Determine targets and coverage from the bundle if it exists and is valid format
  if (operationValidationBundle && Array.isArray(operationValidationBundle.batches)) {
    packet.bundleCount = 1; // Explicitly 1 bundle per requirement
    const seenTargets = new Set();

    for (const batch of operationValidationBundle.batches) {
      if (Array.isArray(batch.targets)) {
        for (const target of batch.targets) {
          const key = `${target.targetType}:${target.targetId}`;
          if (!seenTargets.has(key)) {
            seenTargets.add(key);
            packet.totalTargets++;
          }

          if (!packet.targetTypeCoverage[target.targetType]) {
            packet.targetTypeCoverage[target.targetType] = { targetCount: 0 };
          }
          packet.targetTypeCoverage[target.targetType].targetCount++;
        }
      }
    }

    if (Object.keys(packet.targetTypeCoverage).length === 0 && !hasFail) {
      packet.blockers.push({ code: "empty-target-coverage", message: "Target coverage is empty. No valid targets found in the operation validation bundle." });
      hasBlocked = true;
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
