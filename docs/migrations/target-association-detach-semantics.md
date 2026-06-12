# Target Association Detach Semantics

## Status
Design-only. No runtime changes.

## Problem
In the new Entity / Fact / Projection data model, target associations (`associations` collection) are modeled as append-only Fact documents. This enforces a rigorous historical record.
Normal users can create association Facts but cannot update or delete them. Consequently, when an item is detached from an identifier in the client, the existing active `object_has_marker` Association Fact cannot simply be updated to `{ status: 'detached' }`.
Furthermore, attempting to create a new association Fact with the identical ID as the active association (e.g. `object_has_marker__{objectId}__{markerKey}`) would violate append-only policies and require an update permission that normal users lack.

## Decision
Target association detach is represented by a **new append-only detached Association Fact**.
Existing active Association Facts are **never updated** by normal client runtime code.

## Detached Association Fact Shape
The detached Association Fact follows the same schema as an active association, but transitions the relationship state.

- **associationType**: `object_has_marker`
- **status**: `detached`
- **participants**: Target Entity IDs (`{ objectId, markerKey }`).
- **time fields**:
  - `validUntil`: The authoritative detach transition time (e.g. `detachedAt` or the timestamp of the detach action). This is required.
  - `validFrom`: The original attach time if known. This is optional. If not readily available in local client state without an extra read, it may be omitted.
- **provenance**: Describes how the fact originated.
  - For user runtime: `{ source: 'user_confirmed', confidence: 'confirmed', actorUid: string }`
  - For backfill: `{ source: 'legacy_mapping', confidence: 'high' }`
- **legacy**: Preserves the corresponding legacy detachment mapping without polluting top-level metadata.
  - Example: `{ sourceCollection: 'objectIdentifierBindings', bindingId: string, ownerId: string, detachedBy: string, runtimePath: string }`

## ID Strategy
The ID for the new detached Fact must be strictly collision-free against both the active association ID and any other detached associations for the same pairing.

**Active Association ID format (For reference, do NOT use for detach):**
`object_has_marker__{safeObjectId}__{safeMarkerKey}`

**Runtime ID Strategy (Future Shadow-Write):**
Use UUIDv7 (with hyphens kept intact) to encode the transition uniqueness and order.
`object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__{uuidv7}`

**Backfill ID Strategy:**
For backfilling from legacy database states, prefer deterministic IDs derived from the legacy records.
From a legacy binding record:
`object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__legacy_binding__{safeBindingId}`
From a legacy event record:
`object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__legacy_event__{safeEventId}`

## State Reconstruction Semantics
Future projections and read models will determine the current active vs detached state of a target association by inspecting the timeline of transition Facts.

For each `(objectId, markerKey)` pair, sort all `object_has_marker` Association Facts by their **effective transition time**.
- For active facts: `effectiveTransitionTime = time.validFrom`
- For detached facts: `effectiveTransitionTime = time.validUntil`

The latest effective transition determines whether the relationship is currently active or detached.
If a fact lacks the relevant transition timestamp, future projection/backfill logic must treat it as lower-confidence and prevent it from overriding a fact with a valid transition timestamp. Event Facts may later mirror detach activity for history/audit UI, but they are not the source of truth for target reconstruction.

## Legacy Mapping
When migrating or dual-writing from legacy `objectIdentifierBindings`, preserve fields into the target detached Association Fact as follows:

| Legacy Field (`objectIdentifierBindings`) | Target Detached Association Fact |
|-------------------------------------------|----------------------------------|
| `status: 'detached'`                      | `status: 'detached'` |
| `detachedAt`                              | `time.validUntil` |
| `detachedBy`                              | `legacy.detachedBy` |
| `objectId`                                | `participants.objectId` |
| `identifierKey`                           | `participants.markerKey` |
| `ownerId`                                 | `legacy.ownerId` |
| `id` (bindingId)                          | `legacy.bindingId` |

## Future Runtime Shadow-Write Plan
A future PR will implement target detach shadow dual-write logic (e.g. inside CaptureForm). This implementation should:
- Maintain the legacy detach batch as authoritative.
- After the legacy detach `batch.commit()` succeeds, schedule a non-blocking target detach shadow-write.
- Verify target Object exists and is owned by `actorUid`.
- Verify target Marker exists and is owned by `actorUid`.
- Create a new detached Association Fact using the runtime UUIDv7 collision-free ID strategy.
- **Do not update** the existing active Association Fact.
- Log failures but ensure they do not break the legacy detach flow.

## Future Tests
A future PR implementing the shadow-write must include:
- Builder/rules contract tests for the detached Association Fact.
- Helper unit tests for the future detach shadow-write logic.
- Tests verifying skip behavior if the target Object or Marker is missing or not owned by the actor.
- Tests confirming the existing active association is not updated.
- Tests confirming the new detached Fact creates successfully with `status: 'detached'` and the correct `validUntil`.

## Non-goals
This PR is explicitly design-only. It **does not include**:
- Runtime code implementations for detach.
- Write builder changes for detach.
- Read switching logic.
- Firestore rules changes.
- Backfill scripts or execution.
- Creation of Event Facts (reserved for future audit streams).