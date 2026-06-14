export function buildProjectionBackfillControlledExecutionReviewContract(input, options = {}) {
  const { controlledExecutionDesignPacket, executionDesignGate, operationValidationBundles, environment, operator, notes } = input;

  const contract = {
    success: false,
    valid: false,
    contractType: "projection-backfill-controlled-execution-review-contract",
    overallStatus: "unknown",
    executionAuthorization: false,
    written: false,
    executed: false,
    environment: typeof environment === "string" && environment.trim() !== "" ? environment : "unknown",
    operator: typeof operator === "string" && operator.trim() !== "" ? operator : "unknown",
    reviewScope: {
      sourcePacketStatus: controlledExecutionDesignPacket?.overallStatus || "unknown",
      sourceGateStatus: executionDesignGate?.overallStatus || "unknown",
      bundleCount: 0,
      totalTargets: 0,
      evidenceModes: []
    },
    requiredHumanReviewItems: [
      "confirm target list is explicit",
      "confirm target count and target type coverage are expected",
      "confirm dry-run vs manual-write evidence mode is understood",
      "confirm rollback policy is acceptable",
      "confirm halt criteria are acceptable",
      "confirm monitoring / observation plan is defined in a future step",
      "confirm UI read switching remains out of scope",
      "confirm this artifact is not execution approval"
    ],
    riskRegister: [
      "stale evidence",
      "target list incompleteness",
      "concurrent data changes between validation and future execution",
      "projection reducer bug",
      "operator executing wrong payload",
      "unexpected partial write in future manual operation",
      "UI read switching before separate gate"
    ],
    approvalBoundary: [
      "this contract is not execution approval",
      "no actual backfill execution is authorized",
      "no Firebase call is authorized",
      "no Firestore write is authorized",
      "no deploy is authorized",
      "no UI read switching is authorized",
      "future execution requires separate explicit operator approval"
    ],
    nonGoals: [
      "broad backfill execution",
      "scheduled recompute",
      "queue-based recompute",
      "production read switching",
      "migration cleanup",
      "deleting legacy collections"
    ],
    blockers: [],
    warnings: [],
    notes: Array.isArray(notes) ? [...notes] : []
  };

  let hasFail = false;
  let hasBlocked = false;

  if (!controlledExecutionDesignPacket || typeof controlledExecutionDesignPacket !== "object") {
    contract.blockers.push({ code: "missing-packet", message: "controlledExecutionDesignPacket is required." });
    hasFail = true;
  } else {
    if (controlledExecutionDesignPacket.contractType && controlledExecutionDesignPacket.contractType === "projection-backfill-controlled-execution-review-contract") {
       contract.blockers.push({ code: "invalid-packet-type", message: "Provided packet is already a review contract."});
       hasFail = true;
    }

    if (controlledExecutionDesignPacket.packetType !== "projection-backfill-controlled-execution-design-packet") {
       contract.blockers.push({ code: "invalid-packet-type", message: `Packet packetType must be projection-backfill-controlled-execution-design-packet, got: ${controlledExecutionDesignPacket.packetType}`});
       hasFail = true;
    }

    if (controlledExecutionDesignPacket.valid !== true || controlledExecutionDesignPacket.success !== true) {
       contract.blockers.push({ code: "invalid-packet-state", message: "Packet must have valid:true and success:true." });
       hasFail = true;
    }

    if (controlledExecutionDesignPacket.overallStatus !== "ready-for-controlled-execution-design-review") {
      contract.blockers.push({ code: "invalid-packet-status", message: `Packet overallStatus must be ready-for-controlled-execution-design-review, got: ${controlledExecutionDesignPacket.overallStatus}` });
      hasFail = true;
    }

    if (controlledExecutionDesignPacket.executionAuthorization !== false) {
      contract.blockers.push({ code: "packet-execution-authorization", message: "Packet executionAuthorization must be false." });
      hasFail = true;
    }

    if (controlledExecutionDesignPacket.written !== false) {
      contract.blockers.push({ code: "packet-written", message: "Packet written must be false." });
      hasFail = true;
    }

    if (controlledExecutionDesignPacket.executed !== false) {
      contract.blockers.push({ code: "packet-executed", message: "Packet executed must be false." });
      hasFail = true;
    }

    contract.reviewScope.bundleCount = controlledExecutionDesignPacket.bundleCount || 0;
    contract.reviewScope.totalTargets = controlledExecutionDesignPacket.totalTargets || 0;
    contract.reviewScope.evidenceModes = controlledExecutionDesignPacket.evidenceModes ? [...controlledExecutionDesignPacket.evidenceModes] : [];
  }

  // To support legacy input naming if someone missed it, we handle singular fallback just in case
  let bundlesToProcess = operationValidationBundles;
  if (!bundlesToProcess && input.operationValidationBundle) {
    bundlesToProcess = [input.operationValidationBundle];
  }

  if (!executionDesignGate || typeof executionDesignGate !== "object") {
    contract.blockers.push({ code: "missing-gate", message: "executionDesignGate is required." });
    hasFail = true;
  } else {
    if (executionDesignGate.overallStatus !== "ready-for-execution-design") {
      contract.blockers.push({ code: "invalid-gate-status", message: `Gate overallStatus must be ready-for-execution-design, got: ${executionDesignGate.overallStatus}` });
      hasFail = true;
    }
    if (executionDesignGate.valid !== true || executionDesignGate.success !== true) {
      contract.blockers.push({ code: "invalid-gate-state", message: "executionDesignGate must have valid:true and success:true." });
      hasFail = true;
    }
    if (executionDesignGate.executionAuthorization === true) {
      contract.blockers.push({ code: "gate-execution-authorization", message: "Gate executionAuthorization must not be true." });
      hasFail = true;
    }
    if (executionDesignGate.written === true) {
      contract.blockers.push({ code: "gate-written", message: "Gate written must not be true." });
      hasFail = true;
    }
    if (executionDesignGate.executed === true) {
      contract.blockers.push({ code: "gate-executed", message: "Gate executed must not be true." });
      hasFail = true;
    }
    if (executionDesignGate.bundleCount !== contract.reviewScope.bundleCount) {
       contract.blockers.push({ code: "gate-bundle-count-mismatch", message: `Gate bundleCount (${executionDesignGate.bundleCount}) mismatch with packet (${contract.reviewScope.bundleCount}).` });
       hasFail = true;
    }

    // Cross-reference derived packet data with what the gate explicitly approved
    if (executionDesignGate.totalTargets !== contract.reviewScope.totalTargets) {
       contract.blockers.push({ code: "gate-target-count-mismatch", message: `Gate totalTargets (${executionDesignGate.totalTargets}) mismatch with packet (${contract.reviewScope.totalTargets}).` });
       hasFail = true;
    }

    const gateModes = [...(executionDesignGate.evidenceModes || [])].sort().join(',');
    const packetModes = [...contract.reviewScope.evidenceModes].sort().join(',');
    if (gateModes !== packetModes) {
       contract.blockers.push({ code: "gate-evidence-modes-mismatch", message: `Gate evidenceModes [${gateModes}] mismatch with packet modes [${packetModes}].` });
       hasFail = true;
    }

    if (executionDesignGate.targetTypeCoverage && controlledExecutionDesignPacket && controlledExecutionDesignPacket.targetTypeCoverage) {
      for (const [type, info] of Object.entries(executionDesignGate.targetTypeCoverage)) {
         const packetTypeCount = controlledExecutionDesignPacket.targetTypeCoverage[type] ? controlledExecutionDesignPacket.targetTypeCoverage[type].targetCount : 0;
         if (info.targetCount !== packetTypeCount) {
            contract.blockers.push({ code: "gate-target-coverage-mismatch", message: `Gate targetCount for ${type} (${info.targetCount}) mismatch with packet (${packetTypeCount}).` });
            hasFail = true;
         }
         const packetHasManual = controlledExecutionDesignPacket.targetTypeCoverage[type] ? (controlledExecutionDesignPacket.targetTypeCoverage[type].hasManualWriteEvidence === true) : false;
         if (info.hasManualWriteEvidence !== packetHasManual) {
            contract.blockers.push({ code: "gate-manual-write-coverage-mismatch", message: `Gate hasManualWriteEvidence for ${type} (${info.hasManualWriteEvidence}) mismatch with packet (${packetHasManual}).` });
            hasFail = true;
         }
      }
      for (const type of Object.keys(controlledExecutionDesignPacket.targetTypeCoverage)) {
         if (!executionDesignGate.targetTypeCoverage[type]) {
            contract.blockers.push({ code: "gate-target-coverage-mismatch", message: `Gate is missing coverage for ${type} present in packet.` });
            hasFail = true;
         }
      }
    }
  }

  if (bundlesToProcess && Array.isArray(bundlesToProcess)) {
     if (bundlesToProcess.length !== contract.reviewScope.bundleCount) {
         contract.blockers.push({ code: "bundle-count-mismatch", message: `Provided bundles length (${bundlesToProcess.length}) mismatch with packet bundleCount (${contract.reviewScope.bundleCount}).` });
         hasFail = true;
     }

     let derivedTargetCount = 0;
     const seenModes = new Set();
     const seenTargets = new Set();

     for (let i = 0; i < bundlesToProcess.length; i++) {
        const bundle = bundlesToProcess[i];
        if (!bundle || typeof bundle !== "object") {
           contract.blockers.push({ code: "malformed-bundle", message: `Bundle at index ${i} is malformed.` });
           hasFail = true;
           continue;
        }

        if (bundle.valid !== true || bundle.success !== true) {
           contract.blockers.push({ code: "invalid-bundle", message: `Bundle at index ${i} is invalid or unsuccessful.` });
           hasFail = true;
        }

        if (bundle.overallStatus === "fail" || bundle.overallStatus === "blocked") {
           contract.blockers.push({ code: "failed-bundle", message: `Bundle at index ${i} has status ${bundle.overallStatus}.` });
           hasFail = true;
        }

        if (bundle.written === true) {
           contract.blockers.push({ code: "bundle-written", message: `Bundle at index ${i} has written:true.` });
           hasFail = true;
        }

        if (bundle.executed === true) {
           contract.blockers.push({ code: "bundle-executed", message: `Bundle at index ${i} has executed:true.` });
           hasFail = true;
        }

        if (bundle.executionAuthorization === true) {
           contract.blockers.push({ code: "bundle-execution-authorization", message: `Bundle at index ${i} has executionAuthorization:true.` });
           hasFail = true;
        }

        if (bundle.overallStatus === "dry-run-evidence-pass" || bundle.overallStatus === "manual-write-evidence-pass") {
           seenModes.add(bundle.overallStatus);
        }

        if (Array.isArray(bundle.batches)) {
          for (const batch of bundle.batches) {
            if (Array.isArray(batch.targets)) {
               for (const target of batch.targets) {
                 const key = `${target.targetType}:${target.targetId}`;
                 if (!seenTargets.has(key)) {
                    seenTargets.add(key);
                    derivedTargetCount++;
                 }
               }
            }
          }
        }
     }

     if (!hasFail && contract.reviewScope.totalTargets > 0 && derivedTargetCount !== contract.reviewScope.totalTargets) {
        contract.blockers.push({ code: "bundle-target-count-mismatch", message: `Derived target count (${derivedTargetCount}) from bundles does not match packet totalTargets (${contract.reviewScope.totalTargets}).` });
        hasFail = true;
     }

     const derivedModes = Array.from(seenModes).sort().join(',');
     const expectedModes = [...contract.reviewScope.evidenceModes].sort().join(',');
     if (!hasFail && derivedModes !== expectedModes) {
        contract.blockers.push({ code: "bundle-mode-mismatch", message: `Derived evidence modes [${derivedModes}] from bundles do not match packet modes [${expectedModes}].` });
        hasFail = true;
     }
  }

  // forbidden status strings checks
  const forbiddenStrings = ['ready-for-backfill-execution', 'ready-for-ui-read-switching', 'backfill-complete', 'production-ready'];
  const serializedInput = JSON.stringify(input);
  for (const forbidden of forbiddenStrings) {
    if (serializedInput.includes(forbidden)) {
      contract.blockers.push({ code: "forbidden-status-string", message: `Input contains forbidden status string: ${forbidden}` });
      hasFail = true;
    }
  }

  if (hasFail) {
    contract.overallStatus = "fail";
    contract.success = false;
    contract.valid = false;
  } else if (hasBlocked || contract.blockers.length > 0) {
    contract.overallStatus = "blocked";
    contract.success = false;
    contract.valid = false;
  } else {
    contract.overallStatus = "ready-for-controlled-execution-design-review";
    contract.success = true;
    contract.valid = true;
  }

  return contract;
}

export function formatProjectionBackfillControlledExecutionReviewContract(contract, options = {}) {
  if (options.json) {
    return JSON.stringify(contract, null, 2);
  }

  const lines = [
    `Review Contract Validity: ${contract.valid}`,
    `Overall Status: ${contract.overallStatus}`,
    `Environment: ${contract.environment}`,
    `Operator: ${contract.operator}`,
    `Source Packet Status: ${contract.reviewScope.sourcePacketStatus}`,
    `Source Gate Status: ${contract.reviewScope.sourceGateStatus}`,
    `Bundle Count: ${contract.reviewScope.bundleCount}`,
    `Total Targets: ${contract.reviewScope.totalTargets}`,
    `Evidence Modes: ${contract.reviewScope.evidenceModes.join(', ')}`
  ];

  if (contract.blockers.length > 0) {
    lines.push('');
    lines.push('BLOCKERS:');
    for (const b of contract.blockers) {
      lines.push(`  - [${b.code}] ${b.message}`);
    }
  }

  if (contract.warnings.length > 0) {
    lines.push('');
    lines.push('WARNINGS:');
    for (const w of contract.warnings) {
      lines.push(`  - [${w.code}] ${w.message}`);
    }
  }

  lines.push('');
  lines.push('REQUIRED HUMAN REVIEW ITEMS:');
  for (const item of contract.requiredHumanReviewItems) {
    lines.push(`  - [ ] ${item}`);
  }

  lines.push('');
  lines.push('RISK REGISTER:');
  for (const risk of contract.riskRegister) {
    lines.push(`  - ${risk}`);
  }

  lines.push('');
  lines.push('APPROVAL BOUNDARY:');
  for (const boundary of contract.approvalBoundary) {
    lines.push(`  - ${boundary}`);
  }

  lines.push('');
  lines.push('NON-GOALS:');
  for (const goal of contract.nonGoals) {
    lines.push(`  - ${goal}`);
  }

  if (contract.notes.length > 0) {
    lines.push('');
    lines.push('NOTES:');
    for (const n of contract.notes) {
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
  lines.push(`- executionAuthorization: ${contract.executionAuthorization}`);
  lines.push(`- written: ${contract.written}`);
  lines.push(`- executed: ${contract.executed}`);

  return lines.join('\n');
}
