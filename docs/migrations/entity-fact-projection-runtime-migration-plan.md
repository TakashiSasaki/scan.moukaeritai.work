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

**Phase 1: Add new collection write helpers**
- Add pure write-builder functions for markers, associations, observations, measurements, events, summaries.
- Do not call them from runtime yet.
- Add tests only.

**Phase 2: Controlled dual-write for scanner observations**
- Scanner continues reading identifiers.
- Scanner additionally writes `ObservationDoc` for marker scans if rules/indexes exist.
- `objectEvents` scan write remains until new event/observation path is validated.

**Phase 3: Controlled dual-write for marker attachment**
- CaptureForm continues writing `identifiers` / `objectIdentifierBindings`.
- CaptureForm additionally writes `markers` / `associations`.
- `identifierSummary` remains until `objectSummaries` path is validated.

**Phase 4: currentLocation migration**
- CaptureForm stops treating `ObjectRecord.currentLocation` as canonical.
- Writes `MeasurementDoc` for GPS/manual location.
- Updates `ObjectSummaryDoc.currentPosition` as a derived projection.

**Phase 5: Read switching**
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
- `cd functions && npm run build` (optional validation)

Data validation ideas:
- Count markers vs identifiers.
- Count active `object_has_marker` associations vs active `objectIdentifierBindings`.
- Compare object `identifierSummary` with `objectSummaries`.
- Compare latest scan event/observation sequences.
- Sample QR/NFC scans through Scanner.
- Sample object edit/attach/detach flows through CaptureForm.

## 12. Open Questions

- Should markers be globally ownerless or owner-scoped during the first runtime phase?
- Should objectImages remain separate or eventually become associations/events?
- What feature flag mechanism should control read switching?
- Should events duplicate observations, or should scanner reads become Observation-only plus optional Event?
- How should places be created: user-defined first, inferred from measurements, or both?
- What is the exact deterministic ID strategy for backfilled facts?

## 13. Recommended Next PR

Recommended next PR:
Add write-builder helpers for new collections without calling them from runtime.

Suggested files:
- `src/lib/entityFactProjectionWrites.ts`
- `tests/model/entityFactProjectionWrites.test.ts`

No runtime behavior changes.
No Firestore rules changes.
