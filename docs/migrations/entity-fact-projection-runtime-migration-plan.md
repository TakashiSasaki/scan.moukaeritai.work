# Entity-Fact-Projection Runtime Migration Plan

Status: Planning
Scope: Planning document for phased runtime migration; no runtime behavior changes
Non-goals: Destructive migration, modifying historical legacy data

## 1. Current Runtime Model

The current runtime model relies on the following collections:
- `objects/{objectId}`
- `identifiers/{identifierKey}`
- `objectIdentifierBindings/{bindingId}`
- `objectEvents/{eventId}`
- `objectImages/{imageId}`
- `items/{itemId}` (Legacy source only)

### Current Runtime Behavior

`Scanner.tsx`:
- Normalizes scanned QR/NFC values using `normalizeIdentifierInput`.
- Builds `identifierKey` using `buildIdentifierKey`.
- Looks up records via `identifiers/{identifierKey}`.
- Navigates to `/object/:objectId` if the identifier is active.
- Writes scan events to the `objectEvents` collection.

`CaptureForm.tsx`:
- Reads and writes `objects`.
- Reads and writes `identifiers`.
- Reads and writes `objectIdentifierBindings`.
- Writes `objectEvents`.
- Stores `currentLocation` directly on `ObjectRecord`.
- Maintains `identifierSummary` directly on `ObjectRecord`.

## 2. Target Runtime Model

The target conceptual model uses Entity, Fact, and Projection collections.

**Entity:**
- `objects/{objectId}`
- `markers/{markerKey}`
- `places/{placeId}`

**Fact:**
- `associations/{associationId}`
- `observations/{observationId}`
- `measurements/{measurementId}`
- `events/{eventId}`

**Projection:**
- `objectSummaries/{objectId}`
- `markerSummaries/{markerKey}`
- `placeSummaries/{placeId}`

### Source-of-Truth Principle
- Entity + Fact is the source of truth.
- Summary / Projection records are derived read models used for performance and UI layout.

## 3. Migration Principles

- No destructive migration.
- Preserve current runtime behavior until replacement reads/writes are fully validated.
- Prefer additive writes before read switching.
- Use dual-write only in controlled phases.
- Never put domain time on Entity docs.
- Use Facts for time-bearing data.
- Use Summary docs for UI/query performance.
- Keep legacy collections readable until backfill and validation are complete.

## 4. Collection Mapping

| Current Collection | Target Collection | Notes |
|---|---|---|
| `identifiers` | `markers` | |
| `objectIdentifierBindings` | `associations` | |
| `identifierObservations` | `observations` | |
| `objectEvents` | `events` | |
| `ObjectRecord.currentLocation` | `measurements` + `objectSummaries.currentPosition` | Location is not an Entity property, it is a measurement and summary. |
| `ObjectRecord.identifierSummary` | `objectSummaries.activeMarkerKeys` (or derived marker summary) | |
| `objectImages` | `objectImages` | Likely remains for now, or is later represented through events/associations if needed. |
| `items` | None | Legacy import source only. |

## 5. Field Mapping

Using existing mapping helpers in `src/lib/entityFactProjectionMapping.ts` as reference:

- `IdentifierRecord.identifierKey` -> `MarkerDoc.markerKey`
- `IdentifierRecord.kind` / `scheme` / `canonicalValue` -> `MarkerDoc.medium` / `mediumSubtype` / `payloadLayer` / `payloadKind` / `canonicalPayload`
- `ObjectIdentifierBindingRecord.attachedAt` -> `AssociationDoc.time.validFrom`
- `ObjectIdentifierBindingRecord.detachedAt` -> `AssociationDoc.time.validUntil`
- `ObjectEventRecord.type` -> `EventDoc.eventType`
- `ObjectRecord.currentLocation` -> `MeasurementDoc` or `ObjectSummaryDoc`, not `ObjectDoc`
- `ObjectRecord.createdAt` / `updatedAt` -> `_meta` only, not domain time

## 6. Runtime Write Migration Phases

**Phase 0: Foundation already added**
- Types, mapping helpers, participant helpers, tests, TODO comments.

**Phase 1: Add new collection write helpers (Completed)**
- Add pure write-builder functions for markers, associations, observations, measurements, events, summaries in `src/lib/entityFactProjectionWrites.ts`.
- Do not call them from runtime yet.
- Add tests only.

**Phase 2: Controlled dual-write for scanner observations (In Progress)**

Runtime contract closure is not a rollout approval. The next gate is the [Scanner Observation Dual-Write Rollout Design Gate](scanner-observation-dual-write-rollout-design-gate.md). Feature flag enablement remains separate and explicit.
- Scanner continues reading identifiers.
- Scanner additionally writes `ObservationDoc` for marker scans via a non-blocking shadow path.
- `objectEvents` scan write remains authoritative.
- *Implementation Notes*:
  - Feature-gated by `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`.
  - Target observations are skipped if the target marker is missing or not owned by the current user.
  - If `objectId` is present but the object is missing or unowned, `objectId` is omitted from the observation rather than failing the write.
  - Target observation failures must not break user-facing scan behaviors.

**Phase 3: Controlled dual-write for marker attachment**
- CaptureForm continues writing `identifiers` / `objectIdentifierBindings`.
- CaptureForm additionally writes `markers` / `associations`.
- `identifierSummary` remains until `objectSummaries` path is validated.
- *Implementation Notes*:
  - CaptureForm marker/association shadow dual-write is feature-gated by `VITE_ENABLE_CAPTURE_MARKER_ASSOCIATION_DUAL_WRITE`.
  - Legacy identifiers and objectIdentifierBindings remain authoritative.
  - Target marker is created only if missing.
  - Existing target marker is not overwritten.
  - Target association is created only if missing.
  - Existing target association is not updated because normal-user Facts are append-only.
  - Target detach semantics are defined in `docs/migrations/target-association-detach-semantics.md`. Detach is represented by a new append-only detached Association Fact, not by updating the active Association Fact.
  - CaptureForm detach / reattach transition shadow dual-write is gated by `VITE_ENABLE_CAPTURE_ASSOCIATION_TRANSITION_DUAL_WRITE`.
  - Legacy detach / reattach remains authoritative.
  - Target transition writes happen only after the legacy batch commit succeeds.
  - Existing Association Facts are never updated by client runtime.

**Phase 4: currentLocation migration**
- CaptureForm currentLocation measurement shadow dual-write is feature-gated by `VITE_ENABLE_CAPTURE_LOCATION_MEASUREMENT_DUAL_WRITE`.
- Legacy `objects.currentLocation` remains authoritative.
- Shadow `MeasurementDoc` writes happen only after the legacy object save/update succeeds.
- A measurement is written only for a location captured during the current form session, not for every save of an object that already has `currentLocation`.
- Reverse-geocoded address is preserved as measurement legacy metadata, not promoted to `Place`.
- `objectSummaries.currentPosition` is deferred to a separate backend/admin-generated projection PR.

**Phase 5: Read switching**
- Projection reconstruction semantics are defined in `docs/migrations/projection-reconstruction-semantics.md`.
- Pure projection reconstruction reducers have been added in `packages/efp-model`.
- Single-target backend/admin projection recompute is active again through the packaged @scan/efp-model dependency. It remains dry-run by default. Full backfill, automated reconciliation, and read switching remain future work.
- Operational validation documentation and helper script exist for single-target projection recompute. Backfill and read switching remain blocked until selected dry-run and single-target write validations have been reviewed.
- `objectSummaries`, `markerSummaries`, and `placeSummaries` are backend/admin-written derived read models.
- Projection generation and reconciliation are prerequisites for read switching.
- UI reads from summaries and facts.
- Legacy collections remain available as fallbacks.

**Phase 6: Backfill and verification**
- Backfill `markers` / `associations` / `events` / `measurements` / `summaries` from legacy data.
- Compare legacy-derived summaries with new summaries.

**Phase 7: Legacy deprecation**
- Proceed only after validation.
- No deletion until a separate explicit migration plan is created.

## 7. Runtime Read Migration Phases

Reads will switch separately from writes during the migration phases.

- Scanner resolver should eventually resolve `markerKey` through `markers` + active `associations`.
- Object detail pages should eventually read `ObjectDoc` + `ObjectSummaryDoc`.
- Marker lists should eventually read `MarkerSummaryDoc`.
- Place-aware UI should read `PlaceDoc` + `PlaceSummaryDoc`.
- Legacy `identifiers` / `objectIdentifierBindings` remain fallback until validated.

## 8. Security Rules and Index Requirements

Expected future requirements:
- Rules for `markers`.
- Rules for `associations`.
- Rules for `observations`.
- Rules for `measurements`.
- Rules for `events`.
- Rules for `objectSummaries` / `markerSummaries` / `placeSummaries`.
- Indexes for `participantKeys`.
- Indexes for `objectIds` / `markerKeys` / `placeIds` / `userIds` where needed.
- Owner-scoped compatibility rules during the migration period.

## 9. Backfill Strategy

An additive backfill approach is required:
- Read legacy `identifiers` and create candidate `MarkerDoc`.
- Read legacy `objectIdentifierBindings` and create candidate `AssociationDoc`.
- Read legacy `objectEvents` and create candidate `EventDoc`.
- Read `ObjectRecord.currentLocation` and create candidate `MeasurementDoc` or `ObjectSummaryDoc`.
- Use deterministic IDs where possible.
- Make the backfill idempotent.
- Run in dry-run mode first.
- Compare counts and sampled records.

## 10. Rollback Strategy

- During dual-write phases, legacy writes remain authoritative.
- New collections can be easily ignored by the runtime if disabled.
- Feature flags or explicit configuration should control read switching.
- Backfilled data is safe to delete and rebuild because Facts can be regenerated from legacy during migration until cutover.

## 11. Validation Strategy

Validation commands:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run ops:validate-efp-drift-closure-plan -- --plan docs/migrations/entity-fact-projection-drift-closure-plan.json --audit docs/migrations/entity-fact-projection-drift-audit.json`
- `cd functions && npm run build` (optional validation)

Data validation ideas:
- Count markers vs identifiers.
- Count active `object_has_marker` associations vs active `objectIdentifierBindings`.
- Compare object `identifierSummary` with `objectSummaries`.
- Compare latest scan event/observation sequences.
- Sample QR/NFC scans through Scanner.
- Sample object edit/attach/detach flows through CaptureForm.

For the latest detailed structural drift tracking, see the [Entity-Fact-Projection Drift Audit JSON](./entity-fact-projection-drift-audit.json) and [Drift Audit Document](./entity-fact-projection-drift-audit.md).

## 12. Open Questions

- Should markers be globally ownerless or owner-scoped during the first runtime phase?
- Should objectImages remain separate or eventually become associations/events?
- What feature flag mechanism should control read switching?
- Should events duplicate observations, or should scanner reads become Observation-only plus optional Event?
- How should places be created: user-defined first, inferred from measurements, or both?
- What is the exact deterministic ID strategy for backfilled facts?

## 13. Recommended Next PR

After rules/index/blueprint preparation via the closure plan validator is merged and validated, rules hardening is a prerequisite before controlled Scanner observation dual-write.

Rules hardening conditions must be met:
- `npm run test:rules` passes.
- target rules reject unknown fields.
- userIds-only and legacy.ownerId-only access paths are both tested where applicable.
- normal users cannot update Facts.
- normal users cannot create/update Projections.

Once rules are hardened and tested, the next recommended runtime PR is:
Controlled Scanner observation dual-write, gated and without read switching. Scanner reads must remain on legacy identifiers until the read-switching phase.

## Scanner Observation Dual-Write Prerequisites

Before implementing controlled Scanner observation dual-write (Phase 2), the following prerequisites derived from builder/rules contract tests must be met:

- write-builder/rules contract tests are in place.
- Firebase Functions deployment safety guard is in place if Functions deployment is touched.
- **Controlled Scanner observation dual-write must pass `actorUid`:** User-scoped rules authorize the write based on `userIds`. If `actorUid` is missing, the write will fail.
- **Target marker document must exist:** Before writing an observation with `markerKeys` under the current rules, the target marker must already be created and owned by the current user.
- **Owned target object requirement:** If `objectId` is included in the target observation, the corresponding target object must exist and be owned by the current user.
- **Reads remain untouched:** Scanner reads must remain on legacy `identifiers` during this phase.
- **Non-blocking failures:** The first runtime PR may use non-blocking/shadow target writes. Failures (e.g. from missing target entities) must be observable and diagnosable but shouldn't break the legacy event stream.
- **Readiness validation:** The [Scanner Observation Dual-Write Readiness Gate](scanner-observation-dual-write-readiness.md) artifact and local validator must pass before rollout.
- **Rules validation:** The `ops:validate-scanner-observation-target-rules-hardening-design` command must pass.
- **Runtime Contract Verification:** The `ops:validate-scanner-observation-dual-write-runtime-contract-evidence` command must pass.
