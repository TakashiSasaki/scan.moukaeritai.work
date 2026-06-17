export function validateScannerObservationDualWriteRolloutDesignGate(input) {
  const {
    designPayload,
    runtimeContractEvidencePayload,
    readinessPayload,
    targetRulesDesignPayload
  } = input;

  const errors = [];
  const warnings = [];
  const safetyNotes = [];

  // Check required inputs exist
  if (!designPayload) {
    errors.push('Missing rollout design payload.');
    return { valid: false, errors, warnings, safetyNotes };
  }
  if (!runtimeContractEvidencePayload) {
    errors.push('Missing runtime contract evidence payload.');
  }
  if (!readinessPayload) {
    errors.push('Missing readiness payload.');
  }
  if (!targetRulesDesignPayload) {
    errors.push('Missing target rules hardening design payload.');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, safetyNotes };
  }

  // 1. Validate Rollout Design Gate Artifact Invariants
  if (designPayload.designType !== 'scanner-observation-dual-write-rollout-design-gate') {
    errors.push(`Invalid designType: expected 'scanner-observation-dual-write-rollout-design-gate', got '${designPayload.designType}'`);
  }
  if (designPayload.status !== 'ready-for-rollout-design-review') {
    errors.push(`Invalid status: expected 'ready-for-rollout-design-review', got '${designPayload.status}'`);
  }

  if (designPayload.featureFlagEnabledInThisStride === true) {
    errors.push('featureFlagEnabledInThisStride must be false.');
  }
  if (designPayload.rolloutApproved === true) {
    errors.push('rolloutApproved must be false.');
  }
  if (designPayload.runtimeDefaultBehaviorChanged === true) {
    errors.push('runtimeDefaultBehaviorChanged must be false.');
  }
  if (designPayload.uiReadSwitchingAuthorized === true) {
    errors.push('uiReadSwitchingAuthorized must be false.');
  }
  if (designPayload.migrationExecuted === true) {
    errors.push('migrationExecuted must be false.');
  }
  if (designPayload.backfillExecuted === true) {
    errors.push('backfillExecuted must be false.');
  }
  if (designPayload.indexesChanged === true) {
    errors.push('indexesChanged must be false.');
  }
  if (designPayload.deployWorkflowChanged === true) {
    errors.push('deployWorkflowChanged must be false.');
  }
  if (designPayload.firebaseProductionCalls === true) {
    errors.push('firebaseProductionCalls must be false.');
  }
  if (designPayload.firestoreWritesPerformed === true) {
    errors.push('firestoreWritesPerformed must be false.');
  }

  if (designPayload.legacyIdentifierObservationsAuthoritative !== true) {
    errors.push('legacyIdentifierObservationsAuthoritative must be true.');
  }
  if (designPayload.objectEventsAuthoritative !== true) {
    errors.push('objectEventsAuthoritative must be true.');
  }
  if (designPayload.targetObservationsShadowOnly !== true) {
    errors.push('targetObservationsShadowOnly must be true.');
  }
  if (designPayload.runtimeContractEvidenceValidated !== true) {
    errors.push('runtimeContractEvidenceValidated must be true.');
  }
  if (designPayload.readinessValidated !== true) {
    errors.push('readinessValidated must be true.');
  }
  if (designPayload.targetRulesHardeningValidated !== true) {
    errors.push('targetRulesHardeningValidated must be true.');
  }

  // 2. Validate Runtime Contract Evidence Invariants
  if (runtimeContractEvidencePayload.status !== 'local-evidence-only') {
    errors.push(`Runtime contract evidence status must be 'local-evidence-only', got '${runtimeContractEvidencePayload.status}'`);
  }
  if (runtimeContractEvidencePayload.builderDescriptorIncludesPath !== true) {
    errors.push('Runtime contract evidence: builderDescriptorIncludesPath must be true.');
  }
  if (runtimeContractEvidencePayload.runtimeShadowWriterFeatureGated !== true) {
    errors.push('Runtime contract evidence: runtimeShadowWriterFeatureGated must be true.');
  }
  if (runtimeContractEvidencePayload.unsupportedSourcesRejected !== true) {
    errors.push('Runtime contract evidence: unsupportedSourcesRejected must be true.');
  }
  if (runtimeContractEvidencePayload.missingOrUnownedObjectIdOmitted !== true) {
    errors.push('Runtime contract evidence: missingOrUnownedObjectIdOmitted must be true.');
  }
  if (runtimeContractEvidencePayload.markerOwnershipRequired !== true) {
    errors.push('Runtime contract evidence: markerOwnershipRequired must be true.');
  }
  if (runtimeContractEvidencePayload.featureFlagEnabled === true) {
    errors.push('Runtime contract evidence: featureFlagEnabled must be false.');
  }
  if (runtimeContractEvidencePayload.rolloutApproved === true) {
    errors.push('Runtime contract evidence: rolloutApproved must be false.');
  }
  if (runtimeContractEvidencePayload.readSwitchingAuthorized === true) {
    errors.push('Runtime contract evidence: readSwitchingAuthorized must be false.');
  }

  // 3. Validate Readiness remains planning-only
  if (readinessPayload.status !== 'ready-for-dual-write-implementation') {
     // Check if it's purely planning/readiness (status might be different but must not imply rollout)
     if (readinessPayload.status === 'rollout-approved' || readinessPayload.status === 'production-ready') {
         errors.push(`Readiness payload status '${readinessPayload.status}' incorrectly implies rollout/production.`);
     }
  }
  if (readinessPayload.featureFlagEnabledInThisStride === true) {
    errors.push('Readiness payload: featureFlagEnabledInThisStride must be false.');
  }

  // 4. Validate Target Rules Hardening Design Constraints
  if (targetRulesDesignPayload.featureFlagEnabledInThisStride === true) {
    errors.push('Target rules design: featureFlagEnabledInThisStride must be false.');
  }
  if (targetRulesDesignPayload.readSwitchingAuthorized === true) {
    errors.push('Target rules design: readSwitchingAuthorized must be false.');
  }

  // 5. Check for forbidden phrases across stringified inputs
  const forbiddenPhrases = [
    'production-ready',
    'rollout-approved',
    'feature-flag-enabled',
    'migration-complete',
    'read-switching-ready'
  ];

  const designStr = JSON.stringify(designPayload);
  for (const phrase of forbiddenPhrases) {
    if (designStr.includes(phrase)) {
      errors.push(`Forbidden phrase found in design artifact: '${phrase}'`);
    }
  }

  // Final check
  const valid = errors.length === 0;

  if (valid) {
    safetyNotes.push('Rollout design gate is structurally valid.');
    safetyNotes.push('Runtime contract evidence invariants strictly upheld.');
    safetyNotes.push('No feature flags enabled in this design step.');
  }

  return { valid, errors, warnings, safetyNotes };
}
