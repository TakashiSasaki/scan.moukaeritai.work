export function validateEntityFactProjectionDriftAudit(audit, options = {}) {
  const result = {
    success: false,
    valid: false,
    status: "blocked",
    auditType: audit?.auditType || "unknown",
    blockerCount: 0,
    warningCount: 0,
    driftItemCount: 0,
    requiredDriftItemCoverage: {},
    blockers: [],
    warnings: [],
    safetyNotes: [
      "This is a documentation/local validation only.",
      "Passing this validation does not authorize runtime migration, backfill, projection recompute behavior changes, Firestore rule changes, or UI read switching.",
      "drift-audit-valid is not migration approval."
    ],
    written: false,
    runtimeBehaviorChanged: false,
    readSwitchingAuthorized: false
  };

  const addBlocker = (msg) => {
    result.blockers.push(msg);
    result.blockerCount++;
  };

  const addWarning = (msg) => {
    result.warnings.push(msg);
    result.warningCount++;
  };

  if (!audit || typeof audit !== "object") {
    addBlocker("Audit must be an object.");
    return result;
  }

  if (audit.auditType !== "entity-fact-projection-drift-audit") {
    addBlocker(`Invalid auditType: expected 'entity-fact-projection-drift-audit', got '${audit.auditType}'`);
  }

  if (typeof audit.schemaVersion !== "number") {
    addBlocker("schemaVersion must be a number.");
  }

  if (audit.status !== "documentation-only") {
    addBlocker(`Invalid status: expected 'documentation-only', got '${audit.status}'`);
  }

  if (audit.runtimeBehaviorChanged !== false) {
    addBlocker("runtimeBehaviorChanged must be false.");
  } else {
    result.runtimeBehaviorChanged = false;
  }

  if (audit.written !== undefined && audit.written !== false) {
    addBlocker("written must be strictly false or omitted.");
  }

  if (audit.readSwitchingAuthorized !== undefined && audit.readSwitchingAuthorized !== false) {
    addBlocker("readSwitchingAuthorized must be strictly false or omitted.");
  }

  // Check for forbidden positive status phrases
  const forbiddenPhrases = [
    "production-ready",
    "ready-for-ui-read-switching",
    "backfill-complete",
    "runtime-migrated",
    "migration-complete"
  ];

  const auditString = JSON.stringify(audit);
  forbiddenPhrases.forEach((phrase) => {
    if (auditString.includes(phrase)) {
      addBlocker(`Forbidden positive status phrase found in audit: '${phrase}'`);
    }
  });

  if (!Array.isArray(audit.driftItems) || audit.driftItems.length === 0) {
    addBlocker("driftItems must be a non-empty array.");
  } else {
    result.driftItemCount = audit.driftItems.length;

    const requiredIds = [
      "objects-current-location",
      "objects-identifier-summary",
      "object-record-created-at-updated-at",
      "identifier-record-observed-at",
      "identifier-record-created-at-updated-at",
      "object-identifier-binding-attached-detached-at",
      "object-identifier-binding-created-at-updated-at",
      "identifiers-owner-id",
      "identifiers-object-id",
      "object-identifier-bindings-collection",
      "identifier-observations-collection",
      "object-events-collection",
      "object-images-collection",
      "items-collection"
    ];

    const foundIds = new Set();

    audit.driftItems.forEach((item, index) => {
      if (!item.id || typeof item.id !== "string") {
        addBlocker(`Item at index ${index} is missing a valid stable 'id'.`);
        return;
      }

      foundIds.add(item.id);

      const requiredStringProps = ["currentPath", "targetModel", "classification", "migrationStatus", "followUp"];
      requiredStringProps.forEach((prop) => {
        if (!item[prop] || typeof item[prop] !== "string") {
          addBlocker(`Item '${item.id}' is missing required string property '${prop}'.`);
        }
      });

      if (item.runtimeChangeInThisStride !== false) {
        addBlocker(`Item '${item.id}' has invalid runtimeChangeInThisStride (must be false).`);
      }

      if (item.readSwitchingAuthorized !== false) {
        addBlocker(`Item '${item.id}' has invalid readSwitchingAuthorized (must be false).`);
      }

      if (item.id === "identifiers-object-id" && item.currentRuntimeAuthoritative !== false) {
        addBlocker(`Item '${item.id}' must be non-authoritative (currentRuntimeAuthoritative must be false).`);
      }

      if (item.id === "items-collection" && item.currentRuntimeAuthoritative !== false) {
        addBlocker(`Item '${item.id}' must be non-authoritative (currentRuntimeAuthoritative must be false).`);
      }
    });

    requiredIds.forEach((id) => {
      if (foundIds.has(id)) {
        result.requiredDriftItemCoverage[id] = true;
      } else {
        result.requiredDriftItemCoverage[id] = false;
        addBlocker(`Missing required drift item with id '${id}'.`);
      }
    });
  }

  if (result.blockerCount === 0) {
    result.success = true;
    result.valid = true;
    result.status = "drift-audit-valid";
  } else {
    result.status = result.blockers.length > 0 ? "blocked" : "fail";
  }

  return result;
}

export function formatEntityFactProjectionDriftAuditValidation(result, options = {}) {
  let output = `\n--- EFP Drift Audit Validation ---\n\n`;
  output += `Status: ${result.status}\n`;
  output += `Audit Type: ${result.auditType}\n`;
  output += `Drift Items Count: ${result.driftItemCount}\n`;

  output += `\nCoverage of Required Items:\n`;
  for (const [id, covered] of Object.entries(result.requiredDriftItemCoverage)) {
    output += `  - ${id}: ${covered ? "✅ Present" : "❌ Missing"}\n`;
  }

  if (result.blockerCount > 0) {
    output += `\n❌ Blockers (${result.blockerCount}):\n`;
    result.blockers.forEach((b) => { output += `  - ${b}\n`; });
  }

  if (result.warningCount > 0) {
    output += `\n⚠️ Warnings (${result.warningCount}):\n`;
    result.warnings.forEach((w) => { output += `  - ${w}\n`; });
  }

  output += `\n🛡️ Safety Notes:\n`;
  result.safetyNotes.forEach((note) => {
    output += `  * ${note}\n`;
  });

  output += `\nExplicit Guarantees:\n`;
  output += `  - No runtime behavior changes.\n`;
  output += `  - No Firestore rules changes.\n`;
  output += `  - No data migration.\n`;
  output += `  - No Firebase calls.\n`;
  output += `  - No Firestore writes.\n`;
  output += `  - No projection recompute/backfill behavior changes.\n`;
  output += `  - No UI read switching.\n`;

  output += `\n----------------------------------\n`;
  return output;
}
