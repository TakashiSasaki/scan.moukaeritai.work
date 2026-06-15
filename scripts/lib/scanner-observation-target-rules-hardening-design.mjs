import { validateScannerObservationDualWriteReadiness } from './scanner-observation-dual-write-readiness.mjs';
import { validateEntityFactProjectionDriftClosurePlan } from './entity-fact-projection-drift-closure-plan.mjs';
import { validateEntityFactProjectionDriftAudit } from './entity-fact-projection-drift-audit.mjs';

const REQUIRED_REQUIRED_FIELDS = [
  "observationId",
  "identifierKey",
  "ownerId",
  "observerKind",
  "observerUid",
  "observedAt",
  "receivedAt",
  "source",
  "observationType",
  "createdAt"
];

const REQUIRED_DENY_CASES = [
  "signed-out create is denied",
  "ownerId not matching auth uid is denied",
  "observerUid not matching auth uid is denied",
  "observerKind other than user is denied for client writes",
  "unknown field is denied",
  "invalid source is denied",
  "invalid observationType is denied",
  "invalid location latitude/longitude is denied",
  "receivedAt not equal to request.time is denied",
  "createdAt not equal to request.time is denied",
  "normal user update is denied",
  "normal user delete is denied",
  "client imported/system/gateway/proximity observations are denied",
  "projection write through observations rules is impossible",
  "read switching is not authorized"
];

const REQUIRED_TEST_IDS = [
  "owner-can-create-valid-observation",
  "signed-out-cannot-create-observation",
  "owner-mismatch-denied",
  "observer-uid-mismatch-denied",
  "observer-kind-device-denied-for-client",
  "unknown-field-denied",
  "invalid-source-denied",
  "invalid-observation-type-denied",
  "invalid-location-denied",
  "received-at-must-be-request-time",
  "created-at-must-be-request-time",
  "normal-user-update-denied",
  "normal-user-delete-denied",
  "admin-delete-allowed",
  "read-switching-not-authorized",
  "projection-write-not-authorized"
];

const REQUIRED_FIXTURE_IDS = [
  "validObservation",
  "unknownFieldObservation",
  "ownerMismatchObservation",
  "observerMismatchObservation",
  "invalidSourceObservation",
  "invalidObservationTypeObservation",
  "invalidLocationObservation",
  "invalidTimeObservation",
  "deviceObserverObservation",
  "systemImportedObservation"
];

const FORBIDDEN_PHRASES = [
  "production-ready",
  "ready-for-ui-read-switching",
  "runtime-migrated",
  "migration-complete",
  "backfill-complete",
  "ready-for-backfill-execution",
  "feature-flag-enabled"
];

export function validateScannerObservationTargetRulesHardeningDesign(design, options = {}) {
  const result = {
    success: false,
    valid: false,
    status: "blocked",
    designType: design?.designType || "unknown",
    targetCollection: design?.targetCollection || "unknown",
    testMatrixCount: 0,
    blockers: [],
    warnings: [],
    safetyNotes: [
      "planning-only",
      "no runtime behavior changes",
      "no Firestore rules changes",
      "no index changes",
      "no feature flag enablement",
      "no migration execution",
      "no Firebase calls",
      "no Firestore writes",
      "no projection recompute/backfill behavior changes",
      "no UI read switching",
      "scanner-observation-target-rules-hardening-design-valid is not rules deployment approval"
    ],
    runtimeBehaviorChanged: false,
    firestoreRulesChanged: false,
    indexesChanged: false,
    featureFlagEnabledInThisStride: false,
    readSwitchingAuthorized: false,
    migrationExecutionAuthorized: false
  };

  const addBlocker = (msg) => result.blockers.push(msg);

  if (!design) {
    addBlocker("Design payload is missing");
    return result;
  }

  if (design.designType !== "scanner-observation-target-rules-hardening-design") {
    addBlocker(`Invalid designType. Expected 'scanner-observation-target-rules-hardening-design', got '${design.designType}'`);
  }

  if (typeof design.schemaVersion !== 'number') {
    addBlocker("schemaVersion must be a number");
  }

  if (design.status !== "planning-only") {
    addBlocker("status must be 'planning-only'");
  }

  if (design.targetCollection !== "observations") {
    addBlocker("targetCollection must be 'observations'");
  }

  if (design.featureFlag !== "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE") {
    addBlocker("featureFlag must be 'VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE'");
  }

  // Strict boolean safety boundaries
  if (design.runtimeBehaviorChanged !== false) {
    result.runtimeBehaviorChanged = true;
    addBlocker("runtimeBehaviorChanged must be false");
  }

  if (design.firestoreRulesChanged !== false) {
    result.firestoreRulesChanged = true;
    addBlocker("firestoreRulesChanged must be false");
  }

  if (design.indexesChanged !== false) {
    result.indexesChanged = true;
    addBlocker("indexesChanged must be false");
  }

  if (design.featureFlagEnabledInThisStride !== false) {
    result.featureFlagEnabledInThisStride = true;
    addBlocker("featureFlagEnabledInThisStride must be false");
  }

  if (design.readSwitchingAuthorized !== false) {
    result.readSwitchingAuthorized = true;
    addBlocker("readSwitchingAuthorized must be false");
  }

  if (design.migrationExecutionAuthorized !== false) {
    result.migrationExecutionAuthorized = true;
    addBlocker("migrationExecutionAuthorized must be false");
  }

  // Cross-validation of paths if provided
  if (design.sourceReadiness && design.sourceReadiness !== "docs/migrations/scanner-observation-dual-write-readiness.json") {
    addBlocker("sourceReadiness must be docs/migrations/scanner-observation-dual-write-readiness.json");
  }
  if (design.sourceClosurePlan && design.sourceClosurePlan !== "docs/migrations/entity-fact-projection-drift-closure-plan.json") {
    addBlocker("sourceClosurePlan must be docs/migrations/entity-fact-projection-drift-closure-plan.json");
  }
  if (design.sourceDriftAudit && design.sourceDriftAudit !== "docs/migrations/entity-fact-projection-drift-audit.json") {
    addBlocker("sourceDriftAudit must be docs/migrations/entity-fact-projection-drift-audit.json");
  }

  // Cross-validate artifacts if provided
  if (options.driftAudit) {
    const auditResult = validateEntityFactProjectionDriftAudit(options.driftAudit);
    if (!auditResult.valid) {
      addBlocker("Provided drift audit artifact failed its own validation.");
    }
  }

  if (options.closurePlan) {
    // Note: closure plan validation might optionally take drift audit if we wanted deep validation,
    // but its basic structural validation doesn't strictly require it.
    const planResult = validateEntityFactProjectionDriftClosurePlan(options.closurePlan, { audit: options.driftAudit });
    if (!planResult.valid) {
      addBlocker("Provided closure plan artifact failed its own validation.");
    }
  }

  if (options.readiness) {
    const readinessResult = validateScannerObservationDualWriteReadiness(options.readiness, {
      closurePlan: options.closurePlan,
      audit: options.driftAudit
    });
    if (!readinessResult.valid) {
      addBlocker("Provided readiness artifact failed its own validation.");
    }
  }

  // Validate allowCreateContract
  if (design.allowCreateContract) {
    const allowCreate = design.allowCreateContract;
    if (allowCreate.collection !== "observations") addBlocker("allowCreateContract.collection must be 'observations'");
    if (allowCreate.operation !== "create") addBlocker("allowCreateContract.operation must be 'create'");
    if (allowCreate.unknownFieldsRejected !== true) addBlocker("allowCreateContract.unknownFieldsRejected must be true");
    if (allowCreate.normalUserUpdateAllowed !== false) addBlocker("allowCreateContract.normalUserUpdateAllowed must be false");
    if (allowCreate.normalUserDeleteAllowed !== false) addBlocker("allowCreateContract.normalUserDeleteAllowed must be false");
    if (allowCreate.readSwitchingAuthorized !== false) addBlocker("allowCreateContract.readSwitchingAuthorized must be false");

    if (Array.isArray(allowCreate.requiredFields)) {
      REQUIRED_REQUIRED_FIELDS.forEach(reqField => {
        if (!allowCreate.requiredFields.includes(reqField)) {
          addBlocker(`Missing required field in allowCreateContract: ${reqField}`);
        }
      });
    } else {
      addBlocker("allowCreateContract.requiredFields must be an array");
    }
  } else {
    addBlocker("Missing allowCreateContract");
  }

  // Validate denyContract
  if (Array.isArray(design.denyContract)) {
    const actualDenyCases = design.denyContract.map(d => d.case);
    REQUIRED_DENY_CASES.forEach(reqCase => {
      if (!actualDenyCases.includes(reqCase)) {
        addBlocker(`Missing deny case in denyContract: "${reqCase}"`);
      }
    });
  } else {
    addBlocker("denyContract must be an array of objects");
  }

  // Validate rulesTestMatrix
  if (Array.isArray(design.rulesTestMatrix)) {
    result.testMatrixCount = design.rulesTestMatrix.length;
    const actualTestIds = design.rulesTestMatrix.map(t => t.id);
    REQUIRED_TEST_IDS.forEach(reqId => {
      if (!actualTestIds.includes(reqId)) {
        addBlocker(`Missing test ID in rulesTestMatrix: ${reqId}`);
      }
    });
  } else {
    addBlocker("rulesTestMatrix must be an array");
  }

  // Validate fixtureContract
  if (Array.isArray(design.fixtureContract)) {
    const actualFixtureIds = design.fixtureContract.map(f => f.id);
    REQUIRED_FIXTURE_IDS.forEach(reqId => {
      if (!actualFixtureIds.includes(reqId)) {
        addBlocker(`Missing fixture ID in fixtureContract: ${reqId}`);
      }
    });
  } else {
    addBlocker("fixtureContract must be an array");
  }

  // Validate indexPlanning
  if (design.indexPlanning) {
    if (design.indexPlanning.indexesChangedInThisStride !== false) {
      addBlocker("indexPlanning.indexesChangedInThisStride must be false");
    }
  } else {
    addBlocker("Missing indexPlanning");
  }

  // Validate nonGoals for forbidden phrases (do a deep string check across the whole object)
  const designString = JSON.stringify(design);
  FORBIDDEN_PHRASES.forEach(phrase => {
    if (designString.includes(phrase)) {
      addBlocker(`Forbidden phrase found in artifact: ${phrase}`);
    }
  });

  if (result.blockers.length === 0) {
    result.success = true;
    result.valid = true;
    result.status = "scanner-observation-target-rules-hardening-design-valid";
  }

  return result;
}

export function formatScannerObservationTargetRulesHardeningDesignValidation(result) {
  const lines = [];
  lines.push(`== Scanner Observation Target Rules Hardening Design Validation ==`);
  lines.push(`Status: ${result.status} (valid: ${result.valid})`);
  lines.push(`Design Type: ${result.designType}`);
  lines.push(`Target Collection: ${result.targetCollection}`);
  lines.push(`Rules Test Matrix Items: ${result.testMatrixCount}`);

  if (result.blockers.length > 0) {
    lines.push(``);
    lines.push(`[BLOCKERS]`);
    result.blockers.forEach(b => lines.push(` - ${b}`));
  }

  if (result.warnings.length > 0) {
    lines.push(``);
    lines.push(`[WARNINGS]`);
    result.warnings.forEach(w => lines.push(` - ${w}`));
  }

  lines.push(``);
  lines.push(`[SAFETY BOUNDARIES]`);
  result.safetyNotes.forEach(n => lines.push(` * ${n}`));

  return lines.join('\n');
}
