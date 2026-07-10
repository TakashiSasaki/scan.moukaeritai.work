# Phase 6B: Imported Observation Execute Design and Safety Plan

## Scope

This document outlines the design and safety plan for the future limited execution path of imported baseline observations. Phase 6B is strictly a design phase and does not implement any executable paths. It outlines how the preview candidates generated in Phase 6A could later be safely executed in a future phase (Phase 7).

## Non-goals

The following are explicitly excluded from Phase 6B:
* **No writes:** No data mutation is performed.
* **No imported observation creation:** No observation records are created in the database.
* **No execute UI:** No user-facing or admin UI buttons for applying/executing imported observations.
* **No client-side imported observation writes:** Client code is not modified to write imported observations.
* **No Firestore rules broadening for imported writes:** Firestore rules remain strictly restrictive against client-created imported observations.
* **No anonymous sign-in:** No changes related to authentication or anonymous users.
* **No device ingestion:** Device or sensor ingestion flows are out of scope.
* **No provisional object workflow:** No implementation of provisional objects or `"provisional"` object statuses.
* **No custody/loan model:** Custody/loan semantics like `currentCustodianUid`, `loans`, `borrowings`, or `custodyTransfers` are not implemented.

## Relationship to Phase 6A

Phase 6A computes preview candidates for imported observations in a safe, read-only, dry-run manner. Phase 6B defines how these preview candidates could be safely executed in the future. Phase 7 will be the first phase where limited execution may be implemented, and this will only happen if explicitly approved based on this design.

## Execution path decision

Future execution must use a backend/Admin SDK path, such as Firebase Cloud Functions, rather than ordinary client Firestore writes.

**Why?**
* Imported observations are system/migration records.
* They use `observerKind: "system"`.
* They use `source: "import"` and `observationType: "imported"`.
* Ordinary clients must not be allowed to create these records directly to maintain the integrity of user-generated observations.
* Firestore rules must continue to block client-created imported observations.

## Future callable function design

A future Cloud Function, e.g., `executeImportedObservationBatch`, could be designed for execution.

**Intended inputs:**
* Authenticated admin caller context
* `ownerId`
* List of deterministic observation IDs or `identifierKey`s
* `dryRunFingerprint` or reviewed candidate hash (useful for validation)
* `maxBatchSize`
* `requireExplicitConfirmation` (boolean)

**Intended outputs:**
* `attempted` count
* `created` count
* `skipped` count
* `conflict` count
* `error` count
* List of created observation IDs
* Skipped details
* Error details
* Post-run diagnostics hint

## Authorization model

* Only admins may execute future imported observation creation.
* Normal users cannot execute it.
* The future backend function must verify admin status server-side.
* Client UI must not be trusted for authorization.
* Firestore rules will continue to block client-created imported observations.

## Idempotency model

* Imported observation IDs are deterministic UUIDv5 IDs.
* The ID payload is derived from canonical JSON.
* The payload includes `ownerId` and `identifierKey`.
* The payload strictly excludes `observedAt` and `objectId` (to maintain identifier stability).
* Repeated execution for the same `ownerId`/`identifierKey` must target the same `observationId`.
* If `identifierObservations/{observationId}` already exists, the future execute path must skip it, avoiding overwrites.

## Candidate revalidation model

Phase 7 execution must revalidate candidates server-side and not trust stale client preview data.

**Server-side revalidation checks:**
* Identifier exists.
* `identifier.ownerId` matches requested `ownerId`.
* Identifier status is allowed.
* Identifier has required source fields.
* `identifier.createdAt` is usable.
* Identifier still has no real observations.
* The deterministic observation document does not already exist.
* The proposed `objectId` is included *only* if the active identifier currently has an `objectId`.
* The deterministic ID payload matches the expected canonical payload.

## Timestamp policy

* `observedAt` for an imported baseline observation should use `identifier.createdAt`.
* It is inferred, not measured.
* Metadata must record:
  * `timestampSource: "identifier.createdAt"`
  * `observedAtIsInferred: true`
* `receivedAt` and `createdAt` should be the execution/server time during Phase 7 execution.
* No null timestamp values should be used.

## Proposed imported observation payload

The intended future write payload shape, consistent with Phase 6A preview:

* `observationId` (Deterministic UUIDv5)
* `identifierKey`
* `ownerId`
* `observerKind: "system"`
* No `observerUid` by default (unless a later design explicitly introduces a migration actor)
* `observedAt` (Inferred from `identifier.createdAt`)
* `receivedAt` (Execution time)
* `createdAt` (Execution time)
* `source: "import"`
* `observationType: "imported"`
* `visibility: "private"`
* `schemaVersion: 1`
* Optional `objectId` (Only included if the active identifier currently points to an `objectId`)
* `metadata.migration`

## Metadata schema

The `metadata.migration` object should include the following fields:

* `name`
* `phase`
* `version`
* `baseline`
* `importedFrom`
* `sourceIdentifierKey`
* `sourceObjectId` (When applicable)
* `timestampSource`
* `observedAtIsInferred`
* `deterministicIdNamespace`
* `deterministicIdPayloadSchemaVersion`
* `deterministicIdPayloadHash` (Optional hash of the canonical UUIDv5 payload, useful for audit/debugging)
* `executedBy` (UID or backend actor identifier for the admin/backend execution actor in Phase 7)

## Batch sizing and limits

Conservative defaults must be used for future Phase 7 execution:
* Max batch size: e.g., 10 or 20 items.
* Manual review must be required before execution.
* Unbounded full execution should not be allowed.
* Execution should require repeated small batches.
* Skipped/conflict results must be surfaced explicitly.

## Failure and rollback model

* Imported observation creation is append-only.
* The execute path must avoid overwrites.
* Rollback should not be assumed.
* If a wrong imported observation is created, remediation would likely require explicit admin review and a separate corrective process.
* This is why Phase 7 should start with very small batches.

## Pre-execute checklist

The following must be satisfied before entering Phase 7:
* Phase 6A dry-run reviewed.
* Deterministic UUID namespace confirmed.
* Lint/build pass.
* Firestore rules still block client imported writes.
* Backend admin authorization design reviewed.
* Max batch size chosen.
* Candidate revalidation implemented server-side.
* Diagnostics run before execute.
* Diagnostics run after execute.

## Phase 6B exit criteria

* Execute design document exists (this document).
* Migration status updated (`docs/migrations/observation-model-migration.md`).
* `AGENTS.md` updated.
* No execution path added.
* No imported observations created.
* No execute/apply/repair UI added.
* Lint/build pass.
* Ready to decide whether to implement Phase 7.
