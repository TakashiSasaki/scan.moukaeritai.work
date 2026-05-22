# Observation Model Migration

## Status

State:
- Current phase: Phase 4 — Read-only diagnostics. (Phases 0, 1, 2, 3A, 3B, 3C, and 3D are completed)
- Version line: Phase 4 is on the `1.4.x` line.
- Immutable migration source baseline: `tag-1.0.0`.
- Current working branch: `scan.moukaeritai.work`, which may contain migration preparation commits after `tag-1.0.0`.
- The legacy `items` -> normalized model migration is completed.
- Future migration work targets the `tag-1.0.0` data model or later non-destructive preparation commits.
- Specification: See [Phase 1: Observation Model Specification](phase-1-observation-model-spec.md).

## Purpose

This migration is intended to add observation-aware behavior without destructively rewriting the current normalized model.

The future core addition is expected to be:
- `identifierObservations`

Phase 3A added the runtime helper foundation for `identifierObservations` writes. Phase 3B integrated the observation write helper into the unknown identifier flow. Phase 3C hardened route-state validation, source handling, typed errors, and observation-only UX. Phase 3D verifies and cleans up the observation-only unknown identifier flow. See [Phase 3D Verification](phase-3d-observation-flow-verification.md).
Phase 4 adds read-only diagnostics to inspect consistency between observation and inventory records. See [Phase 4: Read-only Diagnostics](phase-4-read-only-diagnostics.md). Phase 4 does not implement repair, backfill, imported observations, anonymous sign-in, device ingestion, provisional objects, or custody/loan workflows.

## Baseline normalized model

The `tag-1.0.0` baseline collections:
- `objects`
- `identifiers`
- `objectIdentifierBindings`
- `objectEvents`
- `objectImages`

Invariants:
- `objects/{objectId}` stores `objectId`, and it must equal the document ID.
- `identifiers/{identifierKey}` stores `identifierKey`, and it must equal the document ID.
- `objectIdentifierBindings/{bindingId}` stores `bindingId`, and it must equal the document ID.
- Canonical active binding IDs are deterministic:
  `${objectId}__${identifierKey}__active`
- `objectEvents/{eventId}` stores `eventId`, and it must equal the document ID.
- `objectImages/{imageId}` stores `imageId`, and it must equal the document ID.
- `objectIdentifierBindings` is canonical relationship state, not history.
- `objectEvents` is the object operational history/audit log.
- `IdentifierRecord.objectId` is optional, so unassigned identifiers are already representable.

## Migration principles

- This is a non-destructive additive migration.
- Existing collections remain readable and valid.
- Existing document ID conventions remain valid.
- Existing production data must not be deleted.
- New fields must be optional unless a later phase explicitly changes that.
- Old documents without future observation fields must remain readable.
- The future observation layer must not replace `objectIdentifierBindings` or `objectEvents`.
- The current branch may advance beyond `tag-1.0.0`, but `tag-1.0.0` remains the fixed source baseline for reasoning about compatibility.

## Phase list

Phase 0: Migration governance and baseline freeze
- Create migration governance document.
- Mark `tag-1.0.0` as the immutable source baseline.
- Mark old legacy migration as completed.
- Remove old migration UI from active operation.
- Do not introduce new schema or data writes.

Phase 1: Observation model specification
- Specify `IdentifierObservationRecord`.
- Specify optional fields for `objects` and `identifiers`.
- Decide exact field names and semantics.
- No database writes.
- **Note:** Pre-Phase-2 design decisions are recorded in `docs/migrations/phase-1-observation-model-spec.md`. Phase 2 should use those decisions as implementation constraints.

Phase 2: Additive schema/types/rules (Completed)
- Add TypeScript types.
- Update `firebase-blueprint.json`.
- Add Firestore rules for future observation records.
- Keep old documents compatible.
- **Note:** Phase 2 implements additive TypeScript types, blueprint schema, and conservative Firestore rules. Phase 2 still does not implement UI, runtime observation writes, anonymous sign-in, device ingestion, or backfill.

Phase 3A: Observation write foundation (Completed)
- Add helper foundation for user-created identifier observations.
- Support unassigned observed identifiers without creating objects.
- Keep client-created observations limited to user sighting/scan records.
- Do not implement UI integration yet.

Phase 3B: Unknown identifier flow integration (Completed)
- Integrate observation write helper into the unknown identifier flow.
- Add observation-only recording for unknown NFC/QR/manual scans.
- Allow object creation or attach as separate choices.
- Do not require object creation to save an observation.

Phase 3C: Observation-only flow hardening (Completed)
- Harden route-state validation, source handling, typed errors, and observation-only UX.
- Note: Manual/barcode/camera source flows are currently routed to UnassignedIdentifierScreen with a default source of `manual` if not explicitly provided, and will be fully connected in later UI integration items.

Phase 3D: Observation-only flow verification and cleanup (Completed)
- Verify the observation-only flow has no object/binding/event side effects.
- Clean up related observation helpers.
- Document manual verification checklist.

Phase 4: Read-only diagnostics (Current)
- Add diagnostics for observation migration readiness.
- Do not repair or mutate data yet.
- See [Phase 4: Read-only Diagnostics](phase-4-read-only-diagnostics.md).

Phase 5: Dry-run backfill migration
- Add admin-only dry-run migration for optional field backfill.
- Default to dry-run.
- Return stats and samples.

Phase 6: Optional imported observations
- Optionally create deterministic `observationType: "imported"` records from existing identifiers.
- This must be opt-in, not automatic.

Phase 7: Limited execute and verification
- Execute backfill in limited batches.
- Re-run diagnostics.
- Verify no existing invariants are broken.

Phase 8: Archive/remove legacy migration tools
- Archive or remove old legacy migration UI/function after the new migration path is stable.
- Keep historical migration mapping documentation if useful.

## Global do-not-do list

- Do not add `identifierObservations` in Phase 0.
- Do not change Firestore rules in Phase 0.
- Do not write database migration functions in Phase 0.
- Do not execute database migrations in Phase 0.
- Do not delete production data.
- Do not reinterpret `ownerId` destructively.
- Do not introduce strict loans/borrowings/custody workflows.
- Do not enable client-side device observations before device-auth design exists.
- Do not reuse the old `migrateInventoryModel` function for the new observation migration.

## Phase 0 exit criteria

- `docs/migrations/observation-model-migration.md` exists.
- `AGENTS.md` points agents to this migration plan.
- Old migration UI is no longer exposed as an active profile-menu operation.
- Route catalog no longer presents `/admin/migration` as an active admin database migration tool.
- Old migration implementation is marked as legacy/archive, or at least clearly documented as not for new observation migration.
- No new Firestore schema/rules/data migration has been introduced.
- `npm run lint` and `npm run build` pass, if code was changed.
