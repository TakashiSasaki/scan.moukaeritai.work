import { describe, it, expect } from 'vitest';
import { validateScannerObservationDualWriteReadiness, formatScannerObservationDualWriteReadinessValidation } from '../scripts/lib/scanner-observation-dual-write-readiness.mjs';

describe('scannerObservationDualWriteReadiness', () => {
  const getValidPayload = () => ({
    "readinessType": "scanner-observation-dual-write-readiness",
    "schemaVersion": 1,
    "status": "planning-only",
    "featureFlag": "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE",
    "featureFlagEnabledInThisStride": false,
    "runtimeBehaviorChanged": false,
    "firestoreRulesChanged": false,
    "indexesChanged": false,
    "readSwitchingAuthorized": false,
    "migrationExecutionAuthorized": false,
    "sourceClosurePlan": "docs/migrations/entity-fact-projection-drift-closure-plan.json",
    "sourceDriftAudit": "docs/migrations/entity-fact-projection-drift-audit.json",
    "evidenceRequirements": [
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
    ],
    "rolloutPreconditions": [
      "feature flag remains off by default",
      "enablement requires separate explicit operator decision",
      "rollout should start with limited environment only",
      "monitoring/log review plan must exist before enabling",
      "rollback is disabling the feature flag",
      "no read switching is included",
      "no backfill is included"
    ],
    "rollbackPlan": [
      "disable \"VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE\"",
      "keep legacy \"identifiers\" / \"objectEvents\" paths authoritative",
      "ignore generated \"observations\" until validated",
      "do not delete Facts as routine rollback",
      "investigate failed/skipped shadow write logs separately",
      "read switching remains blocked"
    ],
    "observationWriteContract": {
      "collection": "observations",
      "writeMode": "shadow-dual-write",
      "blockingUserFlow": false,
      "legacyAuthoritativeWritesRemain": ["objectEvents"],
      "legacyAuthoritativeReadsRemain": ["identifiers"],
      "allowedResultStatuses": ["written", "skipped_disabled", "skipped_missing_marker", "skipped_marker_not_owned", "failed"],
      "omittedObjectIdIsAllowed": true,
      "readSwitchingAuthorized": false
    },
    "nonGoals": []
  });

  it('valid readiness JSON returns "scanner-observation-dual-write-readiness-valid"', () => {
    const result = validateScannerObservationDualWriteReadiness(getValidPayload());
    expect(result.valid).toBe(true);
    expect(result.status).toBe('scanner-observation-dual-write-readiness-valid');
  });

  it('missing required evidence requirement fails', () => {
    const payload = getValidPayload();
    payload.evidenceRequirements = payload.evidenceRequirements.filter(r => r !== 'npm run lint passes');
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Missing evidence requirement: npm run lint passes'))).toBe(true);
  });

  it('missing rollout precondition fails', () => {
    const payload = getValidPayload();
    payload.rolloutPreconditions = payload.rolloutPreconditions.filter(r => r !== 'no backfill is included');
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Missing rollout precondition: no backfill is included'))).toBe(true);
  });

  it('missing rollback feature flag disable item fails', () => {
    const payload = getValidPayload();
    payload.rollbackPlan = [];
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Rollback plan must include disabling the feature flag'))).toBe(true);
  });

  it('"featureFlagEnabledInThisStride:true" fails', () => {
    const payload = getValidPayload();
    payload.featureFlagEnabledInThisStride = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('featureFlagEnabledInThisStride must be false'))).toBe(true);
  });

  it('"runtimeBehaviorChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.runtimeBehaviorChanged = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('"firestoreRulesChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.firestoreRulesChanged = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('"indexesChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.indexesChanged = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('"readSwitchingAuthorized:true" fails', () => {
    const payload = getValidPayload();
    payload.readSwitchingAuthorized = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('"migrationExecutionAuthorized:true" fails', () => {
    const payload = getValidPayload();
    payload.migrationExecutionAuthorized = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('observation write contract with "blockingUserFlow:true" fails', () => {
    const payload = getValidPayload();
    payload.observationWriteContract.blockingUserFlow = true;
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
  });

  it('observation write contract without "skipped_disabled" fails', () => {
    const payload = getValidPayload();
    payload.observationWriteContract.allowedResultStatuses = ["written", "failed"];
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('skipped_disabled'))).toBe(true);
  });

  it('observation write contract without "failed" fails', () => {
    const payload = getValidPayload();
    payload.observationWriteContract.allowedResultStatuses = ["written", "skipped_disabled"];
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('failed'))).toBe(true);
  });

  it('forbidden positive phrase fails', () => {
    const payload = getValidPayload();
    payload.nonGoals.push("feature-flag-enabled");
    const result = validateScannerObservationDualWriteReadiness(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Forbidden phrase found: feature-flag-enabled'))).toBe(true);
  });

  it('human-readable formatter includes required notes', () => {
    const result = validateScannerObservationDualWriteReadiness(getValidPayload());
    const formatted = formatScannerObservationDualWriteReadinessValidation(result);
    expect(formatted).toContain('planning-only');
    expect(formatted).toContain('no feature flag enablement');
    expect(formatted).toContain('no runtime behavior changes');
    expect(formatted).toContain('no Firestore rules changes');
    expect(formatted).toContain('no UI read switching');
    expect(formatted).toContain('not rollout approval');
  });
});
