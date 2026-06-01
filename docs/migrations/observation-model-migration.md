# Observation Model Migration

## Status

State:
Latest completed phase: Phase 7D.10 — Firestore Rules Stage 1 additive fields.
Current next phase: Phase 7E — Migration Execution (Blocked).
- Version line: Phases 7B+ proceed on the `1.7.x` version line.
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

Phase 4: Read-only diagnostics (Completed)
- Add read-only, bounded, owner-scoped/current-user diagnostics for observation migration readiness.
- Do not repair or mutate data yet.
- See [Phase 4: Read-only Diagnostics](phase-4-read-only-diagnostics.md).

Phase 5: Dry-run backfill migration (Completed)
- Add an admin-only dry-run migration planner for optional field backfill.
- Computes candidate optional-field backfills without mutating data.
- Does not implement imported observations, actual backfill execution, anonymous sign-in, device ingestion, provisional objects, or custody/loan workflows.
- Phase 5 cleanup (dry-run backfill hardening) completed.
- See [Phase 5: Dry-run Backfill](phase-5-dry-run-backfill.md).

Phase 6-prep: Owner-scoped observations and deterministic UUID foundation (Completed)
- Adds `ownerId` to identifier observations to prepare for imported and system observations.
- Establishes the application-wide deterministic UUIDv5 namespace and canonical JSON helper.
- See [Deterministic UUID Policy](../architecture/deterministic-uuid.md).

Phase 6A: Optional imported observations dry-run (Completed)
- Computes candidate deterministic `observationType: "imported"` records from existing identifiers for preview.
- Does not create imported observation records.
- See [Phase 6A: Imported Observation Dry Run](phase-6a-imported-observation-dry-run.md).

Phase 6B: Imported observation execute design and safety plan (Completed)
- Designs a future limited execution path for imported baseline observations.
- Does not create imported observations or provide an executable path.
- See [Phase 6B: Imported Observation Execute Plan](phase-6b-imported-observation-execute-plan.md).

Phase 7A: Backend imported observation revalidation dry-run (Completed)
- Backend dry-run only.
- Does not create imported observations.
- See [Phase 7A: Backend Imported Observation Revalidation Dry Run](phase-7a-backend-imported-observation-revalidation-dry-run.md).

Phase 7B: Limited imported observation execute without UI (Completed)
- Allows limited backend/Admin SDK writes for imported observations.
- No AdminPanel execute UI.
- Requires server-side revalidation of candidates.
- Uses small batch limits (max 5).
- Does not update identifiers/objects/bindings/events.
- See [Phase 7B: Limited Imported Observation Execute](phase-7b-limited-imported-observation-execute.md).

Phase 7C: Controlled execution readiness and verification runbook (Completed)
- Documentation/readiness only for the first controlled execution.
- Does not execute anything.
- Does not deploy anything.
- Does not mutate production data.
- Prepares the first controlled execution procedure; execution still requires separate manual approval.
- See [Phase 7C: Controlled Execution Readiness and Verification Runbook](phase-7c-controlled-execution-runbook.md).

Phase 7D: GitHub Actions controlled dry-run preparation (Completed)
- Dry-run only through GitHub Actions controlled path preparation.
- Prepares workflow_dispatch inputs and bounded dry-run output checks.
- Does not execute final migration writes.
- Does not create imported observations.
- Final controlled execution is reserved for Phase 7E with separate explicit approval.
- See [Phase 7D: GitHub Actions Controlled Dry-run Preparation](phase-7d-github-actions-controlled-dry-run.md).

Phase 7D.1: Legacy items field coverage audit (Completed)
- Read-only audit only.
- The live-data audit was run and confirmed `items.bluetoothTags` exists in live data.
- Phase 7E final execution remains blocked.
- See [Phase 7D.1: Legacy Items Field Coverage Audit](phase-7d1-legacy-items-field-coverage-audit.md).
- See [Migration Design Checklist](migration-design-checklist.md) for general migration rules.

Phase 7D.2: Observable identifier / signal observation model design (Completed)
- Design-only phase.
- Prepares a generalized model for Bluetooth tags, Wi-Fi APs, beacons, observation sets, and generic target bindings.
- Does not modify runtime schema, Firestore rules, or execute writes.
- Phase 7E remains blocked.
- See [Phase 7D.2: Observable Identifier and Signal Observation Model](phase-7d2-observable-identifier-signal-observation-model.md).

Phase 7D.3: Bluetooth legacy migration dry-run design (Completed)
- Design-only phase.
- Prepares a concrete, non-executing dry-run design for migrating legacy `items.bluetoothTags` based on the 7D.2 model.
- Does not modify runtime schema, Firestore rules, or execute writes.
- The Bluetooth legacy migration has not been executed.
- Phase 7E remains blocked.
- See [Phase 7D.3: Bluetooth Legacy Migration Dry-run Design](phase-7d3-bluetooth-legacy-migration-dry-run-design.md).

Phase 7D.3a — Database design documentation hardening
- Database structure docs were hardened.
- Database design decision matrix was added.
- Phase 7E remains blocked.
- This is a documentation/design task only. No schema, rules, runtime changes, or Firestore writes were made.

Phase 7D.3b — Ownerless global identifier model decision
- design/documentation only
- identifiers are now conceptually ownerless global entities
- objects remain owner-owned
- observations record observers
- bindings/claims carry owner/assertion context
- `tagType` is map-and-preserve legacy metadata
- Bluetooth tag identity follows the ownerless global identifier model
- RSSI is observation metadata
- linkedAt is binding/event timestamp candidate
- Phase 7E remains blocked
- no runtime schema/rules/functions/migration writes were changed

Phase 7D.3c — JCS UUIDv5 identifier identity specification
- documentation/specification only
- identifier semantic identity is represented as JCS-canonical JSON
- `identifierKey` is UUIDv5 over that JCS payload
- `ownerId`, `objectId`, and `legacyItemId` are not part of identifier identity
- `IdentifierRecord.ownerId` is a future optional, non-identifying field
- Phase 7E remains blocked
- no runtime schema, rules, blueprint, functions, migrations, or Firestore writes were changed

Phase 7D.5 — Ownerless identifier runtime schema proposal (Completed)
- documentation/specification only
- reflects identifier v2 model decisions
- removes `idPurpose` from canonical identifier payload
- introduces `identityModelVersion` conceptually as runtime interpretation metadata
- keeps existing `identifiers` collection as canonical registry
- keeps `scheme` in semantic identifier identity
- replaces future `rawValue` design with optional `rawPayload`
- treats `IdentifierRecord.objectId` as legacy-only / non-authoritative
- defers ACL fields and `identifierClaims`
- no runtime schema/rules/blueprint/functions/migrations/Firestore writes changed
- Phase 7E remains blocked
- Deploy to Firebase Hosting ran automatically after merge and succeeded.
- This confirms the hosting/build deployment path for this documentation update only.
- It does not imply runtime schema, Firestore rules, or migration execution changes.


Phase 7D.6 — Additive identifier runtime schema implementation planning (Completed)
- planning/audit only
- no runtime schema/rules/blueprint/functions/migration/Firestore writes changed
- creates additive runtime schema implementation plan and dependency audit for ownerless/global identifier v2 transition
- Phase 7E remains blocked
- See [Phase 7D.6: Additive Identifier Runtime Schema Plan](phase-7d6-additive-identifier-runtime-schema-plan.md).

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

Phase 7D.7 — Identifier model blockers and implementation readiness (Completed)
- documentation/specification only
- resolves remaining identifier model blockers prior to runtime implementation
- decides Bluetooth object binding semantics, raw legacy snapshot preservation, identity version default behavior, status/label initial treatment, legacy schemaVersion compatibility, and optional ownerId staging
- defines staged Firestore rules transition strategy without modifying rules
- no runtime schema/rules/blueprint/functions/migrations/Firestore writes changed
- Phase 7E remains blocked
- See [Phase 7D.7: Identifier Model Blockers and Readiness](phase-7d7-identifier-model-blockers-and-readiness.md).

Phase 7D.8 — Additive identifier runtime schema implementation (Completed)
- bounded additive implementation
- adds IdentifierRecord v2 additive fields
- adds pure unit-test foundation
- updates firebase blueprint additively
- does not write Firestore data
- does not execute migration
- does not modify Firestore rules
- does not deploy
- Phase 7E remains blocked

Phase 7D.9 — Firestore rules transition design and readiness audit (Completed)
- design/readiness only
- audits current rules baseline and runtime write path inventory
- details source-to-target migration completeness for rules-relevant fields
- outlines conservative staged transition strategy and future emulator test plan
- does not modify `firestore.rules`
- does not execute migrations or create imported/synthetic observations
- Phase 7E remains blocked
- See [Phase 7D.9: Firestore Rules Transition Design](phase-7d9-firestore-rules-transition-design.md).

Phase 7D.10 — Firestore rules Stage 1 additive fields (Completed)
- Stage 1 additive identifier rules allowance.
- Narrow Firestore rules transition.
- Additive fields only (`rawPayload`, `identityModelVersion`, `identitySchemaVersion`, `canonicalizationVersion`).
- Runtime creation paths now align by appending Stage 1 metadata (omitting `rawPayload` for now).
- Update paths intentionally do not backfill Stage 1 metadata.
- No ownerless/global identifiers.
- No Phase 7E execution.
- See [Phase 7D.10: Firestore Rules Stage 1 Additive Fields](phase-7d10-firestore-rules-stage1-additive-fields.md).
