import { describe, it, expect } from 'vitest';
import { validateScannerObservationTargetRulesHardeningDesign, formatScannerObservationTargetRulesHardeningDesignValidation } from '../scripts/lib/scanner-observation-target-rules-hardening-design.mjs';

describe('scannerObservationTargetRulesHardeningDesign', () => {
  const getValidPayload = () => ({
    "designType": "scanner-observation-target-rules-hardening-design",
    "schemaVersion": 1,
    "status": "planning-only",
    "targetCollection": "observations",
    "featureFlag": "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE",
    "runtimeBehaviorChanged": false,
    "firestoreRulesChanged": false,
    "indexesChanged": false,
    "featureFlagEnabledInThisStride": false,
    "readSwitchingAuthorized": false,
    "migrationExecutionAuthorized": false,
    "sourceReadiness": "docs/migrations/scanner-observation-dual-write-readiness.json",
    "sourceClosurePlan": "docs/migrations/entity-fact-projection-drift-closure-plan.json",
    "sourceDriftAudit": "docs/migrations/entity-fact-projection-drift-audit.json",
    "allowCreateContract": {
      "operation": "create",
      "collection": "observations",
      "allowedActors": ["authenticated-user"],
      "disallowedActors": ["signed-out-user"],
      "ownerConstraint": "ownerId must equal request.auth.uid",
      "observerConstraint": "observerKind must be user and observerUid must equal request.auth.uid",
      "timeConstraint": "receivedAt and createdAt must equal request.time; observedAt must be timestamp",
      "allowedSources": ["nfc", "qr", "manual", "barcode", "camera"],
      "allowedObservationTypes": ["sighting", "scan"],
      "requiredFields": [
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
      ],
      "optionalFields": [
        "objectId",
        "observerIsAnonymous",
        "placeLabel",
        "location",
        "note",
        "metadata",
        "visibility",
        "schemaVersion"
      ],
      "unknownFieldsRejected": true,
      "normalUserUpdateAllowed": false,
      "normalUserDeleteAllowed": false,
      "adminDeleteAllowed": true,
      "readSwitchingAuthorized": false
    },
    "denyContract": [
      {
        "id": "signed-out-create-denied",
        "case": "signed-out create is denied",
        "operation": "create",
        "actor": "signed-out",
        "expected": "deny",
        "reason": "client-created observations require an authenticated user"
      },
      {
        "id": "owner-id-mismatch-denied",
        "case": "ownerId not matching auth uid is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "user can only create observations for items they own"
      },
      {
        "id": "observer-uid-mismatch-denied",
        "case": "observerUid not matching auth uid is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "user cannot fake the observer identity"
      },
      {
        "id": "observer-kind-device-denied",
        "case": "observerKind other than user is denied for client writes",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "clients cannot create device or system level observations directly"
      },
      {
        "id": "unknown-field-denied",
        "case": "unknown field is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "strict schema validation prevents unknown fields"
      },
      {
        "id": "invalid-source-denied",
        "case": "invalid source is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "source must be within allowed enum values"
      },
      {
        "id": "invalid-observation-type-denied",
        "case": "invalid observationType is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "observationType must be within allowed enum values"
      },
      {
        "id": "invalid-location-denied",
        "case": "invalid location latitude/longitude is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "location must have valid lat/lng boundaries"
      },
      {
        "id": "received-at-mismatch-denied",
        "case": "receivedAt not equal to request.time is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "server must stamp receivedAt"
      },
      {
        "id": "created-at-mismatch-denied",
        "case": "createdAt not equal to request.time is denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "server must stamp createdAt"
      },
      {
        "id": "normal-user-update-denied",
        "case": "normal user update is denied",
        "operation": "update",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "observations are immutable facts"
      },
      {
        "id": "normal-user-delete-denied",
        "case": "normal user delete is denied",
        "operation": "delete",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "observations are immutable facts"
      },
      {
        "id": "system-imported-observation-denied",
        "case": "client imported/system/gateway/proximity observations are denied",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "clients cannot write backend-only observation kinds"
      },
      {
        "id": "projection-write-denied",
        "case": "projection write through observations rules is impossible",
        "operation": "create",
        "actor": "authenticated-user",
        "expected": "deny",
        "reason": "projections belong to separate collections, cannot be written here"
      },
      {
        "id": "read-switching-not-authorized",
        "case": "read switching is not authorized",
        "operation": "list",
        "actor": "client",
        "expected": "deny",
        "reason": "read switching is deferred to future strides"
      }
    ],
    "rulesTestMatrix": [
      {
        "id": "owner-can-create-valid-observation",
        "operation": "create",
        "actor": "owner",
        "expected": "allow",
        "reason": "baseline valid operation",
        "fixture": "validObservation"
      },
      {
        "id": "signed-out-cannot-create-observation",
        "operation": "create",
        "actor": "signed-out",
        "expected": "deny",
        "reason": "must be authenticated",
        "fixture": "validObservation"
      },
      {
        "id": "owner-mismatch-denied",
        "operation": "create",
        "actor": "non-owner",
        "expected": "deny",
        "reason": "ownerId does not match auth.uid",
        "fixture": "ownerMismatchObservation"
      },
      {
        "id": "observer-uid-mismatch-denied",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "observerUid does not match auth.uid",
        "fixture": "observerMismatchObservation"
      },
      {
        "id": "observer-kind-device-denied-for-client",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "clients cannot create non-user observations",
        "fixture": "deviceObserverObservation"
      },
      {
        "id": "unknown-field-denied",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "strict schema validation",
        "fixture": "unknownFieldObservation"
      },
      {
        "id": "invalid-source-denied",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "source enum validation",
        "fixture": "invalidSourceObservation"
      },
      {
        "id": "invalid-observation-type-denied",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "observationType enum validation",
        "fixture": "invalidObservationTypeObservation"
      },
      {
        "id": "invalid-location-denied",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "location coordinates bounds validation",
        "fixture": "invalidLocationObservation"
      },
      {
        "id": "received-at-must-be-request-time",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "server timestamp enforcement",
        "fixture": "invalidTimeObservation"
      },
      {
        "id": "created-at-must-be-request-time",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "server timestamp enforcement",
        "fixture": "invalidTimeObservation"
      },
      {
        "id": "normal-user-update-denied",
        "operation": "update",
        "actor": "owner",
        "expected": "deny",
        "reason": "observations are immutable",
        "fixture": "validObservation"
      },
      {
        "id": "normal-user-delete-denied",
        "operation": "delete",
        "actor": "owner",
        "expected": "deny",
        "reason": "observations are immutable",
        "fixture": "validObservation"
      },
      {
        "id": "admin-delete-allowed",
        "operation": "delete",
        "actor": "admin",
        "expected": "allow",
        "reason": "admin override",
        "fixture": "validObservation"
      },
      {
        "id": "read-switching-not-authorized",
        "operation": "list",
        "actor": "owner",
        "expected": "deny",
        "reason": "reads not yet enabled",
        "fixture": "validObservation"
      },
      {
        "id": "projection-write-not-authorized",
        "operation": "create",
        "actor": "owner",
        "expected": "deny",
        "reason": "projections cannot be written via observations rules",
        "fixture": "validObservation"
      }
    ],
    "fixtureContract": [
      {
        "id": "validObservation",
        "purpose": "baseline valid client-created scanner observation",
        "baseFields": "minimum valid observation create payload",
        "overrides": {},
        "expected": "allow"
      },
      {
        "id": "unknownFieldObservation",
        "purpose": "observation with unexpected field",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "__unknown_field": "value"
        },
        "expected": "deny"
      },
      {
        "id": "ownerMismatchObservation",
        "purpose": "observation with ownerId not matching auth uid",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "ownerId": "other_user_id"
        },
        "expected": "deny"
      },
      {
        "id": "observerMismatchObservation",
        "purpose": "observation with observerUid not matching auth uid",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "observerUid": "other_user_id"
        },
        "expected": "deny"
      },
      {
        "id": "invalidSourceObservation",
        "purpose": "observation with source outside the client-allowed source enum",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "source": "invalid_source"
        },
        "expected": "deny"
      },
      {
        "id": "invalidObservationTypeObservation",
        "purpose": "observation with observationType outside the client-allowed enum",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "observationType": "invalid_type"
        },
        "expected": "deny"
      },
      {
        "id": "invalidLocationObservation",
        "purpose": "observation with invalid location coordinates",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "location": {
            "latitude": 999,
            "longitude": 999
          }
        },
        "expected": "deny"
      },
      {
        "id": "invalidTimeObservation",
        "purpose": "observation with receivedAt or createdAt not matching server time",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "receivedAt": "not-request-time",
          "createdAt": "not-request-time"
        },
        "expected": "deny"
      },
      {
        "id": "deviceObserverObservation",
        "purpose": "observation with observerKind device",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "observerKind": "device"
        },
        "expected": "deny"
      },
      {
        "id": "systemImportedObservation",
        "purpose": "observation simulating backend/system import",
        "baseFields": "minimum valid observation create payload",
        "overrides": {
          "source": "gateway",
          "observerKind": "system"
        },
        "expected": "deny"
      }
    ],
    "indexPlanning": {
      "indexesChangedInThisStride": false,
      "likelyFutureQueryPatterns": [
        "observations by identifierKey",
        "observations by ownerId",
        "observations by objectId",
        "observations by receivedAt",
        "observations by observedAt"
      ],
      "decisionsDeferred": "index decisions deferred until runtime query path is implemented",
      "notes": "no index file changes in this stride"
    },
    "nonGoals": []
  });

  it('valid design JSON returns "scanner-observation-target-rules-hardening-design-valid"', () => {
    const result = validateScannerObservationTargetRulesHardeningDesign(getValidPayload());
    expect(result.valid).toBe(true);
    expect(result.status).toBe('scanner-observation-target-rules-hardening-design-valid');
  });

  it('missing required test matrix item fails', () => {
    const payload = getValidPayload();
    payload.rulesTestMatrix = payload.rulesTestMatrix.filter(r => r.id !== 'owner-can-create-valid-observation');
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Missing test ID in rulesTestMatrix: owner-can-create-valid-observation'))).toBe(true);
  });

  it('missing deny case fails', () => {
    const payload = getValidPayload();
    payload.denyContract = payload.denyContract.filter(d => d.case !== 'signed-out create is denied');
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Missing deny case in denyContract: "signed-out create is denied"'))).toBe(true);
  });

  it('missing fixture contract item fails', () => {
    const payload = getValidPayload();
    payload.fixtureContract = payload.fixtureContract.filter(f => f.id !== 'validObservation');
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Missing fixture ID in fixtureContract: validObservation'))).toBe(true);
  });

  it('"runtimeBehaviorChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.runtimeBehaviorChanged = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('runtimeBehaviorChanged must be false'))).toBe(true);
  });

  it('"firestoreRulesChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.firestoreRulesChanged = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('firestoreRulesChanged must be false'))).toBe(true);
  });

  it('"indexesChanged:true" fails', () => {
    const payload = getValidPayload();
    payload.indexesChanged = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('indexesChanged must be false'))).toBe(true);
  });

  it('"featureFlagEnabledInThisStride:true" fails', () => {
    const payload = getValidPayload();
    payload.featureFlagEnabledInThisStride = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('featureFlagEnabledInThisStride must be false'))).toBe(true);
  });

  it('"readSwitchingAuthorized:true" fails', () => {
    const payload = getValidPayload();
    payload.readSwitchingAuthorized = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('readSwitchingAuthorized must be false'))).toBe(true);
  });

  it('"migrationExecutionAuthorized:true" fails', () => {
    const payload = getValidPayload();
    payload.migrationExecutionAuthorized = true;
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('migrationExecutionAuthorized must be false'))).toBe(true);
  });

  it('invalid source readiness path fails', () => {
    const payload = getValidPayload();
    payload.sourceReadiness = 'invalid-path.json';
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('sourceReadiness must be docs/migrations/scanner-observation-dual-write-readiness.json'))).toBe(true);
  });

  it('source readiness artifact failing its own validator fails', () => {
    const payload = getValidPayload();
    const result = validateScannerObservationTargetRulesHardeningDesign(payload, {
      readiness: { readinessType: 'invalid' }
    });
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Provided readiness artifact failed its own validation.'))).toBe(true);
  });

  it('forbidden phrase fails', () => {
    const payload = getValidPayload();
    payload.nonGoals.push("feature-flag-enabled");
    const result = validateScannerObservationTargetRulesHardeningDesign(payload);
    expect(result.valid).toBe(false);
    expect(result.blockers.some(b => b.includes('Forbidden phrase found in artifact: feature-flag-enabled'))).toBe(true);
  });

  it('human-readable formatter contains all safety notes and "not rules deployment approval"', () => {
    const result = validateScannerObservationTargetRulesHardeningDesign(getValidPayload());
    const formatted = formatScannerObservationTargetRulesHardeningDesignValidation(result);
    expect(formatted).toContain('planning-only');
    expect(formatted).toContain('no runtime behavior changes');
    expect(formatted).toContain('no Firestore rules changes');
    expect(formatted).toContain('no index changes');
    expect(formatted).toContain('no feature flag enablement');
    expect(formatted).toContain('no migration execution');
    expect(formatted).toContain('no Firebase calls');
    expect(formatted).toContain('no Firestore writes');
    expect(formatted).toContain('no projection recompute/backfill behavior changes');
    expect(formatted).toContain('no UI read switching');
    expect(formatted).toContain('not rules deployment approval');
  });
});
