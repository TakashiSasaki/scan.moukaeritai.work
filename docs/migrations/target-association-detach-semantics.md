# Target Association Detach Semantics

## Status
Design-only. No runtime changes.

## Problem
In the new Entity / Fact / Projection data model, target associations (`associations` collection) are modeled as append-only Fact documents. This enforces a rigorous historical record.
Normal users can create association Facts but cannot update or delete them. Consequently, when an item is detached from an identifier in the client, the existing active `object_has_marker` Association Fact cannot simply be updated to `{ status: 'detached' }`.
Furthermore, attempting to create a new association Fact with the identical ID as the active association (e.g. `object_has_marker__{objectId}__{markerKey}`) would violate append-only policies and require an update permission that normal users lack.

## Decision
Both detach and reattach transitions are represented by **new append-only Association Facts**.
Existing active Association Facts are **never updated** by normal client runtime code.

## Detached and Reattach Association Fact Shapes
Transition Association Facts follow the same schema as an initial active association, but act as timeline transitions.

**Initial Attach:**
- **associationType**: `object_has_marker`
- **status**: `active`
- **time fields**: `validFrom` (required, the attach time).

**Detach Transition:**
- **associationType**: `object_has_marker`
- **status**: `detached`
- **time fields**:
  - `validUntil`: The authoritative detach transition time (e.g. `detachedAt` or the timestamp of the detach action). This is required.
  - `validFrom`: The original attach time if known. This is optional. Do not force an extra read of the active target Association Fact only to populate this.

**Reattach / Active Transition:**
- **associationType**: `object_has_marker`
- **status**: `active`
- **time fields**:
  - `validFrom`: The new authoritative attach/reattach transition time. This is required.
  - `validUntil`: Omitted.

- **provenance**: Describes how the fact originated.
  - For user runtime: `{ source: 'user_confirmed', confidence: 'confirmed', actorUid: string }`
  - For backfill: `{ source: 'legacy_mapping', confidence: 'high' }`
- **legacy**: Preserves the corresponding legacy mapping without polluting top-level metadata.
  - Example: `{ sourceCollection: 'objectIdentifierBindings', bindingId: string, ownerId: string, detachedBy: string, runtimePath: string }`

## ID Strategy
The IDs for transition Facts must be strictly collision-free against the initial active association ID and any other transition associations for the same pairing. Object IDs and Marker Keys must be sanitized using a safe-id strategy (e.g. `safeIdPart`).

**Initial Active Association ID:**
`object_has_marker__{safeObjectId}__{safeMarkerKey}`

**Runtime ID Strategy (Future Shadow-Write):**
Use standard hyphenated UUIDv7 to encode transition uniqueness and order.
- Detach Transition: `object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__{uuidv7}` (via `buildObjectHasMarkerDetachedAssociationId`)
- Reattach Transition: `object_has_marker_active__{safeObjectId}__{safeMarkerKey}__{uuidv7}` (via `buildObjectHasMarkerActiveTransitionAssociationId`)

**Backfill ID Strategy:**
For backfilling from legacy database states, prefer deterministic IDs derived from the legacy records.
From a legacy binding record:
- Detach Transition: `object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__legacy_binding__{safeBindingId}`
- Reattach Transition: `object_has_marker_active__{safeObjectId}__{safeMarkerKey}__legacy_binding__{safeBindingId}__reattached`
From a legacy event record:
- Detach Transition: `object_has_marker_detached__{safeObjectId}__{safeMarkerKey}__legacy_event__{safeEventId}`
- Reattach Transition: `object_has_marker_active__{safeObjectId}__{safeMarkerKey}__legacy_event__{safeEventId}`

## State Reconstruction Semantics
Future projections and read models will determine the current active vs detached state of a target association by inspecting the timeline of all transition Facts. Event Facts are out of scope for the current reconstruction design and will only be used for audit/activity streams.

For each `(objectId, markerKey)` pair:
Collect all `object_has_marker` Association Facts for that pair. Each Fact contributes one relationship-state transition. Sort them ascending by their **effective transition time**.

- For active facts (initial or reattach): `effectiveTransitionTime = time.validFrom`
- For detached facts: `effectiveTransitionTime = time.validUntil`

The latest effective transition determines whether the relationship is currently active or detached.
If a fact lacks the relevant transition timestamp, future projection/backfill logic must treat it as lower-confidence and prevent it from overriding a fact with a valid transition timestamp.

*Example:*
- Active at T1
- Detached at T2
- Active at T3
Reconstructs as currently active, because the latest valid transition is the active Fact at T3.

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
The current `CaptureForm` marker/association attach shadow-write helper is only for the initial attach shadow path. A future PR must implement explicit transition handling for both detach and reattach.

*Note: The pure builder functions for these transition facts live in `src/lib/entityFactProjectionWrites.ts`. Future runtime code must call the explicit transition builders (`buildObjectHasMarkerDetachedAssociationWrite` and `buildObjectHasMarkerActiveTransitionAssociationWrite`) rather than reusing the initial active association builder with the deterministic initial association ID.*

That future implementation should:
- Maintain the legacy attach/detach batch as authoritative.
- After the legacy detach/reattach `batch.commit()` succeeds, schedule a non-blocking target transition shadow-write.
- Verify target Object exists and is owned by `actorUid`.
- Verify target Marker exists and is owned by `actorUid`.
- Create a new transition Association Fact (`status: 'detached'` or `status: 'active'`) using the appropriate runtime UUIDv7 collision-free ID strategy.
- **Do not update** the existing active Association Fact.
- **Do not update** detached Association Facts.
- Log failures but ensure they do not break the legacy attach/detach flow.

## Future Tests
A future PR implementing the shadow-write must include:
- Helper unit tests for the future detach shadow-write logic.
- Tests verifying skip behavior if the target Object or Marker is missing or not owned by the actor.

*Note: Builder/rules contract tests for both detached and reattach transition facts have already been implemented.*

## Non-goals
This PR is explicitly design-only. It **does not include**:
- Runtime code implementations for detach.
- Write builder changes for detach.
- Read switching logic.
- Firestore rules changes.
- Backfill scripts or execution.
- Creation of Event Facts (reserved for future audit streams).