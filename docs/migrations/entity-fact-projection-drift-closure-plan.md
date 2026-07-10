# Entity-Fact-Projection Drift Closure Plan

## Status
`planning-only`

## Purpose
This document decomposes the items listed in the Entity-Fact-Projection Drift Audit into actionable closure tracks. It defines the sequencing and rules/index prerequisites needed before runtime behaviors can be safely modified.

## Safety Boundary / Non-Goals
This stride represents a local-only planning artifact. The following strictly apply:

- planning/local validation only
- no runtime behavior changes
- no Firestore rules changes
- no index changes
- no migration execution
- no Firebase calls
- no Firestore writes
- no projection recompute/backfill behavior changes
- no UI read switching
- not migration approval

Passing the local drift closure plan validation **does not** authorize migration or read-switching. The current runtime collections remain authoritative until explicit phase approvals.

## Source Artifacts
- Source Audit: `docs/migrations/entity-fact-projection-drift-audit.json`

## Closure Tracks
The drift closure work is organized into parallel and sequential tracks:

- `measurements-and-object-summary`: Offloading `objects.currentLocation` via measurement shadow-writes and projection summarization.
- `identifier-summary-to-projections`: Replacing `objects.identifierSummary` with backend-computed `objectSummaries` and `markerSummaries`.
- `entity-metadata-time-separation`: Distinguishing domain event times from simple `createdAt`/`updatedAt` persistence metadata.
- `marker-observation-times`: Replacing static fields like `lastObservedAt` with observation fact event aggregation.
- `association-fact-time`: Shifting relations from mutable bindings to append-only `associations`.
- `marker-identity-ownership`: Migrating from owner-scoped to global ownerless identity concepts.
- `association-relation-model`: Formalizing graph relations vs embedded objects.
- `observation-fact-model`: Replacing `identifierObservations`.
- `event-fact-model`: Expanding and replacing `objectEvents`.
- `image-model-decision`: Evaluating integration paths for `objectImages`.
- `legacy-items-deprecation`: Finalizing deprecation of old sources like `items`.

## Drift Item to Closure Track Mapping

| Drift Item | Closure Track | Closure Status | Rules/Index Needed | Future PR | Notes |
| --- | --- | --- | --- | --- | --- |
| `objects-current-location` | `measurements-and-object-summary` | `planned-not-started` | Yes | `measurement-shadow-write-validation` | |
| `objects-identifier-summary` | `identifier-summary-to-projections` | `planned-not-started` | Yes | `projection-read-switching` | |
| `object-record-created-at-updated-at` | `entity-metadata-time-separation` | `planned-not-started` | No | `legacy-items-deprecation` | Maintain legacy UI compat. |
| `identifier-record-observed-at` | `marker-observation-times` | `planned-not-started` | Yes | `controlled-scanner-observation-dual-write` | |
| `identifier-record-created-at-updated-at` | `entity-metadata-time-separation` | `planned-not-started` | No | `legacy-items-deprecation` | |
| `object-identifier-binding-attached-detached-at` | `association-fact-time` | `planned-not-started` | Yes | `marker-association-dual-write-validation` | Append-only logic. |
| `object-identifier-binding-created-at-updated-at` | `entity-metadata-time-separation` | `planned-not-started` | No | `legacy-items-deprecation` | |
| `identifiers-owner-id` | `marker-identity-ownership` | `planned-not-started` | Yes | `ownerless-global-marker-migration` | Ownerless concept. |
| `identifiers-object-id` | `association-relation-model` | `planned-not-started` | No | `marker-association-dual-write-validation` | |
| `object-identifier-bindings-collection` | `association-relation-model` | `planned-not-started` | No | `legacy-items-deprecation` | Needs full decoupling. |
| `identifier-observations-collection` | `observation-fact-model` | `planned-not-started` | Yes | `controlled-scanner-observation-dual-write` | |
| `object-events-collection` | `event-fact-model` | `planned-not-started` | Yes | `event-shadow-write-validation` | |
| `object-images-collection` | `image-model-decision` | `planned-not-started` | No | `image-model-architecture-decision` | |
| `items-collection` | `legacy-items-deprecation` | `planned-not-started` | No | `legacy-items-deprecation` | Legacy imports. |

## Rules / Index Readiness Blueprint
Before runtime closure begins, future Rules Hardening PRs must enforce the following strict guarantees across `markers`, `associations`, `observations`, `measurements`, `events`, `objectSummaries`, `markerSummaries`, and `placeSummaries`:

- `npm run test:rules` passes
- target rules reject unknown fields
- userIds-only access paths are tested where applicable
- legacy.ownerId-only access paths are tested where applicable
- normal users cannot update Facts
- normal users cannot create or update Projections
- admin/backend-only projection write path is separately validated

## Future PR Sequencing
The proposed phase sequence based on this blueprint is:
1. Rules/index readiness blueprint validation
2. Target rules hardening design validation (This Stride)
3. Firestore rules hardening PR
4. Scanner Observation Dual-Write Readiness Gate validation
5. Controlled Scanner observation dual-write validation
6. Marker/association dual-write validation
7. Measurement shadow-write validation
8. Projection recompute/backfill/read-switching work, each separately gated

## Validation
Validation checks can be run via:
`npm run ops:validate-efp-drift-closure-plan -- --plan docs/migrations/entity-fact-projection-drift-closure-plan.json --audit docs/migrations/entity-fact-projection-drift-audit.json`

## Interpretation
Validation merely confirms the structured completeness of the plan against the audit. It explicitly does not trigger network requests, rules updates, or database modifications.