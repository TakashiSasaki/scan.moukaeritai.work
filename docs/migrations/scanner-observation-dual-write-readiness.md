# Scanner Observation Dual-Write Readiness

## Status

**planning-only**

## Purpose

The purpose of this readiness artifact is to document and enforce the constraints for the "Controlled Scanner Observation Dual-Write Rollout Readiness Gate" stride. It ensures that the target EFP (Entity Fact Projection) write path can be deployed safely without impacting the currently authoritative `identifiers` and `objectEvents` paths.

## Safety Boundary / Non-Goals

This readiness gate is specifically constrained to validation and documentation. The following are explicit non-goals and must not occur within this stride:
- Enabling the `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE` feature flag.
- Changing runtime read paths.
- Modifying Firestore rules.
- Modifying Firestore indexes.
- Running migrations or executing backfills.
- Switching UI reads to use the new models.
- Deleting legacy collections.

## Source Artifacts

- [Scanner Observation Target Rules Hardening Design](scanner-observation-target-rules-hardening-design.json)
- [Drift Closure Plan](entity-fact-projection-drift-closure-plan.json)
- [Drift Audit](entity-fact-projection-drift-audit.json)

## Current Runtime Contract

The new `observations` writes operate as a **shadow-dual-write**.
- The existing `identifiers` lookup remains authoritative.
- The existing `objectEvents` writes remain authoritative.
- The shadow writes to `observations` are strictly **non-blocking**. Failure to write a shadow observation must not interrupt the user's primary scanning flow.

## Evidence Requirements

All of the following must be validated before this stride is considered complete:
- `npm run lint` passes
- `npm run test` passes
- `npm run build` passes
- `npm run test:rules` passes
- `npm run ops:validate-efp-drift-audit` passes
- `npm run ops:validate-efp-drift-closure-plan` passes
- `scannerObservationDualWrite` unit tests pass
- `write-builder` rules contract tests pass
- Target `observations` rules reject unknown fields
- Target `observations` rules reject invalid time
- Target `observations` normal user update/delete is denied
- Scanner shadow write is non-blocking
- Scanner shadow write is skipped when the feature flag is disabled
- Scanner shadow write omits `objectId` when the object is missing or unowned
- Scanner legacy identifier lookup remains authoritative
- Scanner `objectEvents` write remains authoritative
- UI read switching remains disabled

## Rollout Preconditions

The following preconditions must be true before the operator manually enables the feature flag:
- The feature flag remains off by default.
- Enablement requires a separate explicit operator decision.
- Rollout should start with a limited environment only.
- A monitoring and log review plan must exist before enabling.
- The rollback plan is explicitly disabling the feature flag.
- No read switching is included in the rollout.
- No backfill is included in the rollout.

## Rollback Plan

If issues are detected during the rollout, the following rollback steps must be taken:
1. Disable `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`.
2. Keep legacy `identifiers` and `objectEvents` paths authoritative.
3. Ignore generated `observations` until they are validated.
4. Do not delete Facts as a routine rollback.
5. Investigate failed/skipped shadow write logs separately.
6. Read switching remains blocked.

## Validation

Validation is performed locally using the script:
```bash
npm run ops:validate-scanner-observation-dual-write-readiness -- \
  --readiness docs/migrations/scanner-observation-dual-write-readiness.json \
  --closure-plan docs/migrations/entity-fact-projection-drift-closure-plan.json \
  --drift-audit docs/migrations/entity-fact-projection-drift-audit.json
```

## Interpretation

- This is planning and local validation only.
- The feature flag is not enabled by this stride.
- The scanner legacy `identifiers` lookup remains authoritative.
- The legacy `objectEvents` write remains authoritative.
- Target `observations` writes are shadow-only and non-blocking.
- `skipped_*` statuses are expected safe outcomes, not user-facing errors.
- A `failed` shadow write must not break scan resolution.
- Passing readiness validation is not rollout approval. Rollout approval or environment config changes must be a separate explicit PR or operator action.

## Runtime Contract Evidence
A separate local evidence artifact is available to verify the runtime write contract. See `scanner-observation-dual-write-runtime-contract-evidence.md`.

## Next Gates
- Runtime contract closure is not a rollout approval.
- The next gate is the [Scanner Observation Dual-Write Rollout Design Gate](scanner-observation-dual-write-rollout-design-gate.md).
- Feature flag enablement remains separate and explicit.
