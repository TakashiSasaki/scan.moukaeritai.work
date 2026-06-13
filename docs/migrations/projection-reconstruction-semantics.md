# Projection Reconstruction Semantics

This document defines the rules for reconstructing Projection summaries (`objectSummaries`, `markerSummaries`, `placeSummaries`) from target Entity and Fact collections in the Entity/Fact/Projection data model.

*Implementation Note: Canonical pure projection reducers live in packages/efp-model and are emitted as part of the package build. The canonical pure reducers are emitted through @scan/efp-model dual artifacts. The legacy src/lib/projectionReconstruction.ts path remains a compatibility re-export.*

Backend/admin single-target projection recompute is implemented by the callable function recomputeProjectionSummary. It consumes @scan/efp-model through the Functions package dependency, defaults to dry-run, and does not switch runtime reads.
The callable can be operationally validated per target before any backfill. Successful dry-run does not imply read switching readiness.

## Principles

The design of projection summaries strictly adheres to the following principles:

- **Entities and Facts are Source-of-Truth:** The canonical state of the system is entirely defined by timeless Entities (Objects, Markers, Places) and temporal Facts (Associations, Observations, Measurements, Events).
- **Projections are Derived Read Models:** Summaries exist purely to optimize client reads, querying, and UI rendering. They do not contain any original source-of-truth information.
- **Admin/Backend Written Only:** Ordinary client runtime code must never write `objectSummaries`, `markerSummaries`, or `placeSummaries`. Summaries are strictly written by backend admin processes, Cloud Functions, or migration/backfill tooling.
- **Safe to Delete and Rebuild:** Because they are derived, projection documents can be deleted and entirely rebuilt from the underlying Facts during migrations or reconciliations.
- **Read Switching is Deferred:** Runtime client reads must not switch to using these summaries until projection generation, validation, and automated reconciliation are completely validated.

---

## Reconstruction Rules

### `ObjectSummaryDoc`

The `ObjectSummaryDoc` represents the current active state of an Object.

#### `activeMarkerKeys`

The list of currently active markers attached to the object is reconstructed from the timeline of `object_has_marker` Association Facts.

**Rule:**
1. For each `(objectId, markerKey)` pair:
   - Collect all `object_has_marker` Association Facts.
   - For facts representing an active attach transition, use `time.validFrom` as the effective transition time.
   - For facts representing a detach transition, use `time.validUntil` as the effective transition time.
   - Missing timestamps: Association transition Facts without their relevant effective transition timestamp are lower-confidence and must not override timestamped transitions.
2. Sort the collected transition Facts chronologically by their effective transition time (see "Tie-breaking" section below).
3. The latest valid transition determines the current relationship state.
4. If the latest transition is `status = active`, the `markerKey` is included in `objectSummaries.activeMarkerKeys`.
5. If the latest transition is `status = detached`, the `markerKey` is not included.

#### `currentPosition` and `lastMeasuredAt`

The current geographic location of an object is derived from Measurement Facts.

**Rule:**
1. For each `objectId`:
   - Collect all Measurement Facts involving the object that have `measurementType` in `['location', 'gps_position']` (or equivalent position-bearing measurements).
   - Require `position.latitude` and `position.longitude` to be present.
   - Missing timestamps: Measurement Facts without `time.measuredAt` are not eligible and must be ignored.
2. Sort the collected Measurement Facts descending by `time.measuredAt`.
3. The most recent valid position-bearing measurement becomes the `currentPosition`.
4. `lastMeasuredAt` is set to the same measurement's `time.measuredAt`.
5. The chosen measurement's ID is included in `derivedFromFactIds`.

*Note: Reverse-geocoded addresses must not be promoted to a `Place` during this process. Addresses remain as legacy metadata until a separate explicit `Place` design is introduced.*

#### `lastObservedAt`

The last time an object was observed is derived from Observation Facts.

**Rule:**
1. For each `objectId`:
   - Collect all Observation Facts whose `objectIds` array contains the `objectId`.
   - Missing timestamps: Observation Facts without `time.observedAt` are not eligible and must be ignored. Do not fall back to persistence metadata like `_meta.createdAt`.
2. Sort the collected Observation Facts descending by `time.observedAt`.
3. The most recent valid observation determines `lastObservedAt`.
4. The chosen observation's ID is included in `derivedFromFactIds`.

**Future optional: temporal marker-to-object observation join**
Currently, marker-only Observations (where the payload only identifies a marker and does not explicitly list the `objectId`) do not update `objectSummaries.lastObservedAt`. A future projection implementation may optionally join marker-only Observations to an Object by resolving the marker's active object relation *as of* the observation's `time.observedAt`. This temporal join must strictly use the `object_has_marker` Association timeline to determine ownership at that exact moment, rather than joining against the current latest relation.

---

### `MarkerSummaryDoc`

The `MarkerSummaryDoc` represents the current active state and activity summary of a Marker.

#### `relatedObjectIds`

The list of objects currently attached to the marker is reconstructed from the Association timeline.

**Rule:**
1. Use the same `object_has_marker` Association timeline logic defined above for `ObjectSummary` per `markerKey`.
2. Include any `objectId` whose latest transition for the `(objectId, markerKey)` relationship is `active`.

#### `lastObservedAt`

The last time a marker was observed is derived from Observation Facts.

**Rule:**
1. Collect the latest Observation Fact whose `markerKeys` array contains the `markerKey`.
2. Require a valid `time.observedAt`.
3. Set `lastObservedAt` to the chosen observation's `time.observedAt`.

#### `recentObservationCount`

`recentObservationCount` counts Observation Facts for the marker within an implementation-configurable lookback window ending at `asOf`.

**Rule:**
- A 30-day window is the recommended default for future implementation, but the exact window and recomputation strategy are implementation-configurable.
- Future implementations may use scheduled admin recompute, batch backfill/recompute, or incremental Cloud Function maintenance.

#### `lastObservedPlaceId`

Only set if an Observation Fact includes `placeIds` or an explicitly resolved place.
*Note: Do not infer a `Place` from reverse-geocoded string addresses in this design.*

---

### `PlaceSummaryDoc`

Because Place runtime behaviors are largely not implemented yet, the `PlaceSummaryDoc` reconstruction rules are conservative and future-facing.

**Rules:**
1. Do not infer or create `Place` documents from free-text address fields.
2. `currentObjectIds` and `currentMarkerKeys` are derived purely from Facts that explicitly include `placeIds`.
3. `lastActivityAt` is the latest relevant `time.observedAt`, `time.measuredAt`, or `time.eventAt` from Facts involving the `placeId`.

---

## Metadata and Tie-Breaking

### `asOf` and `derivedFromFactIds`

- **`asOf`**: The backend/admin recomputation timestamp (when the projection was generated).
- **`derivedFromFactIds`**: A minimal array of Fact IDs that directly determine the summary state. This should include the IDs of the latest active/detached association transition per marker relation, the chosen latest position measurement, and the latest observation fact. It should not attempt to include every historical fact unless operating in a specific audit/debug mode.

### Deterministic Tie-Breaking

When sorting Facts to determine the "latest" state, deterministic tie-breaking is required to avoid nondeterministic summaries.

**Primary sort key:** `effectiveTransitionTime` (e.g., `time.validFrom`, `time.validUntil`, `time.measuredAt`, `time.observedAt`)
**Secondary sort key:** Fact document ID (`factId`), lexicographically ascending

When two Facts have the exact same effective transition timestamp, the projection code sorts by the Fact document ID lexicographically as the stable secondary key. The latest item after this deterministic ordering wins.

A status-level fallback (such as preferring `detached` over `active`) is strictly a last-resort rule for malformed records that cannot be ordered by timestamp and ID, and should not normally be reached because Fact documents always have IDs.

---

## Validation and Reconciliation Prerequisites

Before any client runtime UI read paths are switched to use projection summaries, an automated reconciliation pass is strictly required.

**Policy:**
Before read switching, automated admin/backfill/reconciliation tooling must compare derived projections against legacy state and produce mismatch reports. Manual sampling is supplementary, not a replacement.

At minimum, tooling should compare:
- `objectSummaries.activeMarkerKeys` against legacy active identifiers / `objectIdentifierBindings`.
- `objectSummaries.currentPosition` against legacy `objects.currentLocation`.
- `markerSummaries.relatedObjectIds` against legacy active bindings.
- `lastObservedAt` / `lastMeasuredAt` against applicable legacy events or target Facts where available.

Legacy collections remain the fallback until an explicit cutover plan is created and mismatches are understood.
