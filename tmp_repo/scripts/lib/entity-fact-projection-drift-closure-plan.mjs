export function validateEntityFactProjectionDriftClosurePlan(plan, options = {}) {
  const result = {
    success: false,
    valid: false,
    status: 'fail',
    planType: null,
    closureItemCount: 0,
    sourceDriftCoverage: {},
    blockers: [],
    warnings: [],
    safetyNotes: [],
    runtimeBehaviorChanged: false,
    firestoreRulesChanged: false,
    indexesChanged: false,
    readSwitchingAuthorized: false,
    migrationExecutionAuthorized: false
  };

  try {
    if (!plan || typeof plan !== 'object') {
      result.blockers.push("Plan must be an object.");
      return result;
    }

    result.planType = plan.planType;
    result.runtimeBehaviorChanged = plan.runtimeBehaviorChanged === true;
    result.firestoreRulesChanged = plan.firestoreRulesChanged === true;
    result.indexesChanged = plan.indexesChanged === true;
    result.readSwitchingAuthorized = plan.readSwitchingAuthorized === true;
    result.migrationExecutionAuthorized = plan.migrationExecutionAuthorized === true;

    // Type validation
    if (plan.planType !== "entity-fact-projection-drift-closure-plan") {
      result.blockers.push(`Invalid planType: ${plan.planType}`);
    }

    if (typeof plan.schemaVersion !== 'number') {
      result.blockers.push("schemaVersion must be a number");
    }

    if (plan.status !== "planning-only") {
      result.blockers.push(`Invalid status: ${plan.status}. Must be "planning-only"`);
    }

    if (plan.runtimeBehaviorChanged !== false) {
      result.blockers.push("runtimeBehaviorChanged must be false in this stride");
    }
    if (plan.firestoreRulesChanged !== false) {
      result.blockers.push("firestoreRulesChanged must be false in this stride");
    }
    if (plan.indexesChanged !== false) {
      result.blockers.push("indexesChanged must be false in this stride");
    }
    if (plan.readSwitchingAuthorized !== false) {
      result.blockers.push("readSwitchingAuthorized must be false in this stride");
    }
    if (plan.migrationExecutionAuthorized !== false) {
      result.blockers.push("migrationExecutionAuthorized must be false in this stride");
    }

    if (plan.sourceAudit !== "docs/migrations/entity-fact-projection-drift-audit.json") {
      result.blockers.push("sourceAudit must point to docs/migrations/entity-fact-projection-drift-audit.json");
    }

    if (!Array.isArray(plan.closureItems) || plan.closureItems.length === 0) {
      result.blockers.push("closureItems must be a non-empty array");
    } else {
      result.closureItemCount = plan.closureItems.length;

      for (const [index, item] of plan.closureItems.entries()) {
        const itemPrefix = `Closure item at index ${index}`;
        if (!item.id || typeof item.id !== 'string') result.blockers.push(`${itemPrefix} is missing id`);
        if (!item.sourceDriftItemId || typeof item.sourceDriftItemId !== 'string') result.blockers.push(`${itemPrefix} is missing sourceDriftItemId`);
        if (!item.closureTrack || typeof item.closureTrack !== 'string') result.blockers.push(`${itemPrefix} is missing closureTrack`);

        if (item.runtimeChangeInThisStride !== false) result.blockers.push(`${itemPrefix} must have runtimeChangeInThisStride: false`);
        if (item.firestoreRulesChangeInThisStride !== false) result.blockers.push(`${itemPrefix} must have firestoreRulesChangeInThisStride: false`);
        if (item.indexesChangeInThisStride !== false) result.blockers.push(`${itemPrefix} must have indexesChangeInThisStride: false`);
        if (item.readSwitchingAuthorized !== false) result.blockers.push(`${itemPrefix} must have readSwitchingAuthorized: false`);
        if (item.migrationExecutionAuthorized !== false) result.blockers.push(`${itemPrefix} must have migrationExecutionAuthorized: false`);

        if (item.sourceDriftItemId) {
          result.sourceDriftCoverage[item.sourceDriftItemId] = (result.sourceDriftCoverage[item.sourceDriftItemId] || 0) + 1;
        }
      }
    }

    // Rules/index readiness
    if (!plan.rulesIndexReadiness || typeof plan.rulesIndexReadiness !== 'object') {
      result.blockers.push("rulesIndexReadiness must be an object");
    } else {
      const r = plan.rulesIndexReadiness;
      if (r.status !== "planning-only") result.blockers.push('rulesIndexReadiness.status must be "planning-only"');
      if (r.rulesChangedInThisStride !== false) result.blockers.push("rulesIndexReadiness.rulesChangedInThisStride must be false");
      if (r.indexesChangedInThisStride !== false) result.blockers.push("rulesIndexReadiness.indexesChangedInThisStride must be false");

      const requiredCollections = [
        "markers", "associations", "observations", "measurements", "events",
        "objectSummaries", "markerSummaries", "placeSummaries"
      ];
      if (!Array.isArray(r.targetCollections)) {
         result.blockers.push("rulesIndexReadiness.targetCollections must be an array");
      } else {
         for (const col of requiredCollections) {
           if (!r.targetCollections.includes(col)) {
             result.blockers.push(`rulesIndexReadiness.targetCollections is missing required collection: ${col}`);
           }
         }
      }

      const requiredChecks = [
        "npm run test:rules passes",
        "target rules reject unknown fields",
        "userIds-only access paths are tested where applicable",
        "legacy.ownerId-only access paths are tested where applicable",
        "normal users cannot update Facts",
        "normal users cannot create or update Projections",
        "admin/backend-only projection write path is separately validated"
      ];

      if (!Array.isArray(r.requiredChecksBeforeRulesHardening)) {
         result.blockers.push("rulesIndexReadiness.requiredChecksBeforeRulesHardening must be an array");
      } else {
         for (const check of requiredChecks) {
           if (!r.requiredChecksBeforeRulesHardening.includes(check)) {
             result.blockers.push(`rulesIndexReadiness.requiredChecksBeforeRulesHardening is missing required check: "${check}"`);
           }
         }
      }
    }

    // Forbidden strings
    const planString = JSON.stringify(plan).toLowerCase();
    const forbiddenPhrases = [
      "production-ready",
      "ready-for-ui-read-switching",
      "runtime-migrated",
      "migration-complete",
      "backfill-complete",
      "ready-for-backfill-execution"
    ];

    for (const phrase of forbiddenPhrases) {
      if (planString.includes(phrase)) {
        result.blockers.push(`Forbidden positive status phrase found: "${phrase}"`);
      }
    }

    // Audit verification
    if (options.audit) {
       const audit = options.audit;
       if (Array.isArray(audit.driftItems)) {
         for (const driftItem of audit.driftItems) {
           const id = driftItem.id;
           const coverage = result.sourceDriftCoverage[id] || 0;
           if (coverage === 0) {
             result.blockers.push(`Audit drift item "${id}" is not covered by any closure item`);
           } else if (coverage > 1) {
             result.blockers.push(`Audit drift item "${id}" is mapped to multiple closure items (count: ${coverage}). Mapping must be unambiguous or safely scoped.`);
           }
         }
       }
    }

    if (result.blockers.length === 0) {
      result.valid = true;
      result.success = true;
      result.status = "drift-closure-plan-valid";
    } else {
      result.status = "blocked";
    }

  } catch (err) {
    result.blockers.push(`Internal validation error: ${err.message}`);
    result.status = "fail";
  }

  return result;
}

export function formatEntityFactProjectionDriftClosurePlanValidation(result, options = {}) {
  const lines = [];
  lines.push("=== Entity-Fact-Projection Drift Closure Plan Validation ===");
  lines.push(`Status: ${result.status}`);
  lines.push(`Valid: ${result.valid}`);

  if (result.closureItemCount > 0) {
    lines.push(`Closure Items Parsed: ${result.closureItemCount}`);
  }

  if (result.blockers.length > 0) {
    lines.push("");
    lines.push("--- BLOCKERS ---");
    result.blockers.forEach(b => lines.push(`- ${b}`));
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("--- WARNINGS ---");
    result.warnings.forEach(w => lines.push(`- ${w}`));
  }

  lines.push("");
  lines.push("--- SAFETY BOUNDARIES ---");
  lines.push("- planning-only");
  lines.push("- no runtime behavior changes");
  lines.push("- no Firestore rules changes");
  lines.push("- no index changes");
  lines.push("- no migration execution");
  lines.push("- no Firebase calls");
  lines.push("- no Firestore writes");
  lines.push("- no projection recompute/backfill behavior changes");
  lines.push("- no UI read switching");
  lines.push("- drift-closure-plan-valid is not migration approval");

  return lines.join("\n");
}
