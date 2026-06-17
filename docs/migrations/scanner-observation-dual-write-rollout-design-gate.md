# Scanner Observation Dual-Write Rollout Design Gate

## Status

**ready-for-rollout-design-review**

## Purpose

The purpose of this document is to define the boundaries and safety constraints for the limited initial rollout of scanner observation dual-writes. It ensures that all prerequisites are verified and that the rollout remains strictly scoped.

## Scope

This gate covers the planning and local verification of the rollout design. It defines the limits on audience, monitoring signals, and stop conditions necessary before any feature flag is toggled in a manual testing context.

## Safety Boundary / Non-Goals

This design gate explicitly enforces the following non-goals for this stride:
- This does not enable `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`.
- This does not approve rollout.
- This does not authorize UI read switching.
- This does not authorize migration or backfill.
- We do not change `firestore.rules` or perform any environment mutation.

## Source Artifacts

- `docs/migrations/scanner-observation-dual-write-readiness.json`
- `docs/migrations/scanner-observation-dual-write-runtime-contract-evidence.json`
- `docs/migrations/scanner-observation-target-rules-hardening-design.json`

## Rollout Scope

- **Initial Environment:** limited-manual-operator-environment
- **Initial Audience:** single-operator-or-internal-test-user
- **Max Initial Users:** 1
- **Explicit Action:** requiresExplicitOperatorAction is true

## Pre-Enablement Checklist

- All local validation commands pass.
- Runtime contract evidence validator passes.
- Feature flag default remains disabled.
- Legacy identifier lookup remains authoritative.
- `objectEvents` write remains authoritative.
- No UI read switching is included.
- Rollback is simply disabling the feature flag.

## Monitoring Signals

- scanner shadow write status distribution
- `skipped_disabled` count
- `skipped_missing_marker` count
- `skipped_marker_not_owned` count
- `failed` count
- `written` count
- `omittedObjectId` count

## Stop Conditions

- Any user-facing scan flow regression.
- Unexpected increase in failed shadow writes.
- Unexpected permission denied errors.
- Unexpected writes containing unowned objectId.
- Unexpected unsupported source writes.
- Any evidence of UI read switching.

## Rollback Plan

- **Primary Action:** Disable `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`
- **Legacy Paths:** Legacy paths (`identifierObservations` and `objectEvents`) remain authoritative.
- **Data Deletion:** Deleting shadow observations during rollback is false (not required).
- **Read Switching:** Read switching rollback is false (since read switching is not yet enabled).

## Post-Rollout Evidence Requirements

- limited rollout status summary
- shadow write result counts
- failure reason sample review
- confirmation legacy scan flow remained authoritative
- confirmation UI read switching remained disabled

## Validation

Validation is strictly performed locally by the `scripts/validate-scanner-observation-dual-write-rollout-design-gate.mjs` script ensuring this artifact adheres to invariants. It verifies safety flags are intact and forbidden terminology is avoided.

## Interpretation

- This does not enable `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`.
- This does not approve rollout.
- This does not authorize UI read switching.
- This does not authorize migration or backfill.
- Actual feature flag enablement must be a separate explicit PR or operator action.
- Legacy `identifierObservations` and `objectEvents` remain authoritative.
