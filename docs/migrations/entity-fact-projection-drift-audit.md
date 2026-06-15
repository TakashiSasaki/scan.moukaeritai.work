# Entity-Fact-Projection Drift Audit

**Status:** documentation-only / local-only audit
**Note:** This is a documentation and local validation stride only. Current runtime remains authoritative until explicit migration/read-switching phase.

## Overview

The purpose of this document is to track the drift between the current production runtime schema and the target Entity-Fact-Projection (EFP) conceptual model.

### Source of Truth
- **Current Runtime:** Legacy/current collections (`objects`, `identifiers`, `objectIdentifierBindings`, etc.) remain authoritative.
- **Target EFP Model:** Entity + Fact form the source of truth, where Projections are derived read models.

## Explicit Non-Goals

The current stride enforces the following non-goals:
- **No runtime behavior changes.**
- **No Firestore rule changes.**
- **No data migration.**
- **No projection recompute behavior changes.**
- **No UI read switching.**
- **No field removal or renaming** from legacy types.

## Drift Categories

The main drift categories identified between the current runtime and the target model are:
1. **Domain time on current runtime entity/compatibility records:** Time information stored on Entities directly instead of Facts.
2. **Denormalized summary/current state fields:** Projections embedded inside Entity records instead of dedicated derived collections.
3. **Legacy relation fields:** Embedded relation fields instead of explicit associations.
4. **OwnerId / identity compatibility:** Ownership embedded directly in global identifier/marker records.
5. **Legacy collections retained for compatibility:** Older collections kept functional during migration phases.

## Drift Items

| ID | Current Path | Target Model | Classification | Allowed Compatibility | Migration Status | Follow-Up |
|----|--------------|--------------|----------------|-----------------------|------------------|-----------|
| `objects-current-location` | `objects.currentLocation` | `measurements + objectSummaries.currentPosition` | `denormalized-current-state-on-entity` | `true` | `documented-not-migrated` | Plan schema extraction for measurements and summary read integration. |
| `objects-identifier-summary` | `objects.identifierSummary` | `objectSummaries / markerSummaries` | `denormalized-summary-on-entity` | `true` | `documented-not-migrated` | Plan shift to read from dedicated Projection collections. |
| `object-record-created-at-updated-at` | `ObjectRecord.createdAt / updatedAt` | `_meta` or Fact/Projection semantics | `domain-time-on-entity-compatibility-field` | `true` (Removal Allowed Now: `false`) | `documented-not-migrated` | Move metadata out of root if necessary, do not treat as domain time. |
| `identifier-record-observed-at` | `IdentifierRecord.firstObservedAt / lastObservedAt / lastSeenAt` | `Observation facts or MarkerSummary` | `observation-time-on-marker-compatibility-field` | `true` | `documented-not-migrated` | Derive from observation facts into marker summaries. |
| `identifier-record-created-at-updated-at` | `IdentifierRecord.createdAt / updatedAt` | metadata / non-domain-time compatibility | `domain-time-on-marker-compatibility-field` | `true` | `documented-not-migrated` | Move metadata out of root, avoid using as domain time. |
| `object-identifier-binding-attached-detached-at` | `ObjectIdentifierBindingRecord.attachedAt / detachedAt` | Association fact time | `association-time-on-legacy-binding` | `true` | `documented-not-migrated` | Model attachments/detachments via Association facts. |
| `object-identifier-binding-created-at-updated-at` | `ObjectIdentifierBindingRecord.createdAt / updatedAt` | metadata only, not domain time on Entity | `domain-time-on-association-compatibility-field` | `true` | `documented-not-migrated` | Retain as metadata, rely on Association fact domain time. |
| `identifiers-owner-id` | `identifiers.ownerId` | conceptual identifier/marker identity is ownerless/global or at least ownerId is non-identifying | `identity-ownership-runtime-compatibility-drift` | `true` (Removal Allowed Now: `false`) | `documented-not-migrated` | Plan ownerless global marker identity migration. |
| `identifiers-object-id` | `identifiers.objectId` | target relationship should be Association | `embedded-relation-compatibility-field` | `true` | `documented-not-migrated` | Ensure relations are correctly mapped via associations. |
| `object-identifier-bindings-collection` | `objectIdentifierBindings` | `associations` | `legacy-relation-collection` | `true` | `documented-not-migrated` | Plan associations extraction and read/write switching. |
| `identifier-observations-collection` | `identifierObservations` | `observations` | `legacy-observation-collection` | `true` | `documented-not-migrated` | Plan pure observation fact model migration. |
| `object-events-collection` | `objectEvents` | `events` | `legacy-event-collection` | `true` | `documented-not-migrated` | Align with new event facts architecture. |
| `object-images-collection` | `objectImages` | target decision open | `retained-current-runtime-collection` | `true` | `documented-not-migrated` | Evaluate if images become associations or remain independent. |
| `items-collection` | `items` | none / replaced | `legacy-source-only` | `true` | `documented-not-migrated` | Finalize import runbook and safely deprecate collection. |

## Future Milestone
- **EFP Drift Closure Planning:** See the [Entity-Fact-Projection Drift Closure Plan JSON](./entity-fact-projection-drift-closure-plan.json) and [Drift Closure Plan Document](./entity-fact-projection-drift-closure-plan.md) for the tracking of future closure steps. The actual closure PRs are separate future strides that will detail runtime migration, backfilling, and safe deployment.
