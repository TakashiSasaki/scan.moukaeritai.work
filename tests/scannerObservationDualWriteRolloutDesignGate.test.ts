import { describe, it, expect } from 'vitest';
import { validateScannerObservationDualWriteRolloutDesignGate } from '../scripts/lib/validate-scanner-observation-dual-write-rollout-design-gate.mjs';

function createValidInput() {
  return {
    designPayload: {
      designType: "scanner-observation-dual-write-rollout-design-gate",
      schemaVersion: 1,
      status: "ready-for-rollout-design-review",
      featureFlag: "VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE",
      featureFlagEnabledInThisStride: false,
      rolloutApproved: false,
      runtimeDefaultBehaviorChanged: false,
      uiReadSwitchingAuthorized: false,
      migrationExecuted: false,
      backfillExecuted: false,
      indexesChanged: false,
      deployWorkflowChanged: false,
      firebaseProductionCalls: false,
      firestoreWritesPerformed: false,
      legacyIdentifierObservationsAuthoritative: true,
      objectEventsAuthoritative: true,
      targetObservationsShadowOnly: true,
      runtimeContractEvidenceValidated: true,
      readinessValidated: true,
      targetRulesHardeningValidated: true
    },
    runtimeContractEvidencePayload: {
      status: "local-evidence-only",
      builderDescriptorIncludesPath: true,
      runtimeShadowWriterFeatureGated: true,
      unsupportedSourcesRejected: true,
      missingOrUnownedObjectIdOmitted: true,
      markerOwnershipRequired: true,
      featureFlagEnabled: false,
      rolloutApproved: false,
      readSwitchingAuthorized: false
    },
    readinessPayload: {
      status: "ready-for-dual-write-implementation",
      featureFlagEnabled: false
    },
    targetRulesDesignPayload: {
      featureFlagEnabled: false,
      uiReadSwitchingAuthorized: false
    }
  };
}

describe('validateScannerObservationDualWriteRolloutDesignGate', () => {
  it('valid rollout design passes', () => {
    const input = createValidInput();
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('featureFlagEnabledInThisStride: true fails', () => {
    const input = createValidInput();
    input.designPayload.featureFlagEnabledInThisStride = true;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('featureFlagEnabledInThisStride must be false.');
  });

  it('rolloutApproved: true fails', () => {
    const input = createValidInput();
    input.designPayload.rolloutApproved = true;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('rolloutApproved must be false.');
  });

  it('uiReadSwitchingAuthorized: true fails', () => {
    const input = createValidInput();
    input.designPayload.uiReadSwitchingAuthorized = true;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('uiReadSwitchingAuthorized must be false.');
  });

  it('migrationExecuted: true fails', () => {
    const input = createValidInput();
    input.designPayload.migrationExecuted = true;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('migrationExecuted must be false.');
  });

  it('missing runtime contract evidence invariant fails', () => {
    const input = createValidInput();
    input.runtimeContractEvidencePayload.markerOwnershipRequired = false;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Runtime contract evidence: markerOwnershipRequired must be true.');
  });

  it('forbidden phrase fails', () => {
    const input = createValidInput();
    (input.designPayload as any).someRandomField = "we are production-ready";
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Forbidden phrase found in design artifact: 'production-ready'");
  });

  it('missing referenced artifact payload fails', () => {
    const input = createValidInput();
    input.runtimeContractEvidencePayload = null;
    const result = validateScannerObservationDualWriteRolloutDesignGate(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing runtime contract evidence payload.');
  });
});
