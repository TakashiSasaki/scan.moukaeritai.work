import fs from 'node:fs';
import { validateEntityFactProjectionDriftClosurePlan } from './entity-fact-projection-drift-closure-plan.mjs';
import { validateEntityFactProjectionDriftAudit } from './entity-fact-projection-drift-audit.mjs';

const REQUIRED_EVIDENCE = [
  "npm run lint passes",
  "npm run test passes",
  "npm run build passes",
  "npm run test:rules passes",
  "npm run ops:validate-efp-drift-audit passes",
  "npm run ops:validate-efp-drift-closure-plan passes",
  "scannerObservationDualWrite unit tests pass",
  "write-builder rules contract tests pass",
  "target observations rules reject unknown fields",
  "target observations rules reject invalid time",
  "target observations normal user update/delete is denied",
  "scanner shadow write is non-blocking",
  "scanner shadow write is skipped when feature flag is disabled",
  "scanner shadow write omits objectId when object is missing or unowned",
  "scanner legacy identifier lookup remains authoritative",
  "scanner objectEvents write remains authoritative",
  "UI read switching remains disabled"
];

const REQUIRED_PRECONDITIONS = [
  "feature flag remains off by default",
  "enablement requires separate explicit operator decision",
  "rollout should start with limited environment only",
  "monitoring/log review plan must exist before enabling",
  "rollback is disabling the feature flag",
  "no read switching is included",
  "no backfill is included"
];

const FORBIDDEN_PHRASES = [
  "feature-flag-enabled",
  "runtime-migrated",
  "migration-complete",
  "ready-for-ui-read-switching",
  "backfill-complete",
  "production-ready"
];

export function validateScannerObservationDualWriteReadiness(readiness, options = {}) {
  const result = {
    success: true,
    valid: true,
    status: "scanner-observation-dual-write-readiness-valid",
    readinessType: "scanner-observation-dual-write-readiness",
    featureFlagEnabledInThisStride: false,
    runtimeBehaviorChanged: false,
    firestoreRulesChanged: false,
    indexesChanged: false,
    readSwitchingAuthorized: false,
    migrationExecutionAuthorized: false,
    blockers: [],
    warnings: [],
    evidenceCoverage: {},
    safetyNotes: [
      "planning-only",
      "no feature flag enablement",
      "no runtime behavior changes",
      "no Firestore rules changes",
      "no index changes",
      "no migration execution",
      "no Firebase calls",
      "no Firestore writes by validator",
      "no projection recompute/backfill behavior changes",
      "no UI read switching",
      "readiness-valid is not rollout approval"
    ]
  };

  if (!readiness) {
    result.success = false;
    result.valid = false;
    result.status = "invalid-payload";
    result.blockers.push("Missing readiness payload");
    return result;
  }

  if (readiness.readinessType !== "scanner-observation-dual-write-readiness") {
    result.blockers.push(`Invalid readinessType: ${readiness.readinessType}`);
  }
  if (typeof readiness.schemaVersion !== 'number') {
    result.blockers.push("schemaVersion must be a number");
  }
  if (readiness.status !== "planning-only") {
    result.blockers.push(`status must be "planning-only"`);
  }
  if (readiness.featureFlag !== "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE") {
    result.blockers.push(`featureFlag must be "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE"`);
  }
  if (readiness.featureFlagEnabledInThisStride !== false) {
    result.blockers.push("featureFlagEnabledInThisStride must be false");
  }
  if (readiness.runtimeBehaviorChanged !== false) {
    result.blockers.push("runtimeBehaviorChanged must be false");
  }
  if (readiness.firestoreRulesChanged !== false) {
    result.blockers.push("firestoreRulesChanged must be false");
  }
  if (readiness.indexesChanged !== false) {
    result.blockers.push("indexesChanged must be false");
  }
  if (readiness.readSwitchingAuthorized !== false) {
    result.blockers.push("readSwitchingAuthorized must be false");
  }
  if (readiness.migrationExecutionAuthorized !== false) {
    result.blockers.push("migrationExecutionAuthorized must be false");
  }
  if (readiness.sourceClosurePlan !== "docs/migrations/entity-fact-projection-drift-closure-plan.json") {
    result.blockers.push("sourceClosurePlan mismatch");
  }
  if (readiness.sourceDriftAudit !== "docs/migrations/entity-fact-projection-drift-audit.json") {
    result.blockers.push("sourceDriftAudit mismatch");
  }

  if (options.driftAudit) {
    if (options.driftAudit.auditType !== "entity-fact-projection-drift-audit") {
      result.blockers.push(`Invalid drift audit auditType: ${options.driftAudit.auditType}`);
    } else {
      const auditResult = validateEntityFactProjectionDriftAudit(options.driftAudit);
      if (!auditResult.valid || !auditResult.success) {
        result.blockers.push("Provided drift audit artifact failed its own validation");
      }
    }
  }

  if (options.closurePlan) {
    if (options.closurePlan.planType !== "entity-fact-projection-drift-closure-plan") {
      result.blockers.push(`Invalid closure plan planType: ${options.closurePlan.planType}`);
    } else {
      const closurePlanResult = validateEntityFactProjectionDriftClosurePlan(options.closurePlan, { audit: options.driftAudit });
      if (!closurePlanResult.valid || !closurePlanResult.success) {
        result.blockers.push("Provided drift closure plan artifact failed its own validation");
      }
    }
  }

  // Evidence Requirements
  const evidenceStr = JSON.stringify(readiness.evidenceRequirements || []);
  for (const req of REQUIRED_EVIDENCE) {
    if (!readiness.evidenceRequirements || !readiness.evidenceRequirements.includes(req)) {
      result.blockers.push(`Missing evidence requirement: ${req}`);
    }
  }

  // Preconditions
  for (const req of REQUIRED_PRECONDITIONS) {
    if (!readiness.rolloutPreconditions || !readiness.rolloutPreconditions.includes(req)) {
      result.blockers.push(`Missing rollout precondition: ${req}`);
    }
  }

  // Rollback Plan
  const hasDisableFlag = readiness.rollbackPlan && readiness.rollbackPlan.some(item => item.includes("disable") && item.includes("VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE"));
  if (!hasDisableFlag) {
     result.blockers.push("Rollback plan must include disabling the feature flag");
  }

  // Observation Write Contract
  const contract = readiness.observationWriteContract;
  if (!contract) {
    result.blockers.push("Missing observationWriteContract");
  } else {
    if (contract.collection !== "observations") result.blockers.push("contract.collection must be observations");
    if (contract.writeMode !== "shadow-dual-write") result.blockers.push("contract.writeMode must be shadow-dual-write");
    if (contract.blockingUserFlow !== false) result.blockers.push("contract.blockingUserFlow must be false");
    if (contract.omittedObjectIdIsAllowed !== true) result.blockers.push("contract.omittedObjectIdIsAllowed must be true");
    if (contract.readSwitchingAuthorized !== false) result.blockers.push("contract.readSwitchingAuthorized must be false");
    if (!contract.allowedResultStatuses || !contract.allowedResultStatuses.includes("written")) result.blockers.push("contract must allow 'written' status");
    if (!contract.allowedResultStatuses || !contract.allowedResultStatuses.includes("skipped_disabled")) result.blockers.push("contract must allow 'skipped_disabled' status");
    if (!contract.allowedResultStatuses || !contract.allowedResultStatuses.includes("failed")) result.blockers.push("contract must allow 'failed' status");
  }

  const jsonStr = JSON.stringify(readiness);
  for (const phrase of FORBIDDEN_PHRASES) {
     if (jsonStr.includes(phrase)) {
       result.blockers.push(`Forbidden phrase found: ${phrase}`);
     }
  }

  if (result.blockers.length > 0) {
    result.success = false;
    result.valid = false;
    result.status = "scanner-observation-dual-write-readiness-invalid";
  }

  return result;
}

export function formatScannerObservationDualWriteReadinessValidation(result, options = {}) {
  let out = "";
  out += `Validation Result: ${result.status}\n`;
  out += `Valid: ${result.valid}\n`;
  out += `Success: ${result.success}\n`;
  if (result.blockers.length > 0) {
    out += `\nBlockers:\n`;
    for (const b of result.blockers) {
      out += `  - ${b}\n`;
    }
  }
  out += `\nSafety Notes:\n`;
  for (const s of result.safetyNotes) {
    out += `  - ${s}\n`;
  }
  return out;
}
