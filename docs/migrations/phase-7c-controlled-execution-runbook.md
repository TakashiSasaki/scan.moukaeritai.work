# Phase 7C: Controlled Execution Readiness and Verification Runbook

## Scope

Phase 7C prepares the manual/operator procedure for the first controlled imported observation execution.

- Phase 7C does not execute anything.
- Phase 7C does not deploy anything.
- Phase 7C does not mutate production data.
- Phase 7C prepares for a later manually approved first controlled execution.

## Non-goals

- no writes
- no imported observation creation
- no AdminPanel execute UI
- no web migration screen execute UI
- no Firestore rules broadening
- no owner-wide execution
- no summary backfill
- no migrationRuns
- no rollback automation
- no anonymous sign-in
- no device ingestion
- no provisional objects
- no custody/loan model

## Current implementation summary

- callable function: `scanExecuteImportedObservationBatch`
- modes: `dryRun` and `execute`
- execute confirmation text: `CREATE_IMPORTED_OBSERVATIONS`
- execute hard batch limit: 5
- imported observations are created only at `identifierObservations/{observationId}`
- actual `observedAt` uses `identifier.createdAt`
- actual `receivedAt` and `createdAt` use server timestamps
- actual metadata uses `metadata.migration.phase: "phase-7b"`
- UUIDv5 deterministic payload keeps `migrationPhase: "phase-6a"`

## Deployment safety

- deployment is handled by GitHub Actions after merge
- functions deployment uses an explicit function-name allow-list
- broad `firebase deploy --only functions` is not used
- the target project is explicitly `moukaeritaid`
- the app-prefixed function name is `scanExecuteImportedObservationBatch`

Exact deployment command used by GitHub Actions:

`npx --yes firebase-tools deploy --only "functions:getAppMetrics,functions:identifyMatches,functions:describeImage,functions:getClientIp,functions:migrateInventoryModel,functions:scanExecuteImportedObservationBatch" --project moukaeritaid --non-interactive`

## Pre-merge checklist

- after dependency install (`npm ci` at repository root and `cd functions && npm ci` in `functions/`)
- root `npm run lint`
- root `npm run build`
- `cd functions && npm run build`
- verify no broad functions deploy command is introduced
- verify no Firestore rules broadening for imported writes
- verify no web execute UI was added
- verify no migrationRuns collection was introduced
- verify no identifier/object/binding/event update path was added

## Local validation environment

- root validation requires installing root dependencies first
- use `npm ci` at repository root when lockfile is in sync
- if lockfile refresh is intentionally needed, use `npm install` at repository root
- run root checks only after install:
  - `npm run lint`
  - `npm run build`
- `vite not found` usually indicates root dependencies are not installed
- missing `react` or `firebase/*` module/type errors at root usually indicate root dependencies are not installed
- if React type declarations are still unresolved after install, add root devDependencies:
  - `@types/react`
  - `@types/react-dom`
- functions validation requires a separate install under `functions/`
- use `cd functions && npm ci` when lockfile is in sync
- if lockfile refresh is intentionally needed in functions, use `cd functions && npm install`
- run `cd functions && npm run build` only after functions dependency install
- functions build failures must not be dismissed as environment-only until after running `cd functions && npm ci`

## Pre-execution checklist

- confirm target Firebase/GCP project
- confirm deployed function name is `scanExecuteImportedObservationBatch`
- confirm caller UID exists in `admins/{uid}`
- choose exactly one target `ownerId`
- choose at most 5 `identifierKeys`
- verify selected identifiers are non-sensitive and acceptable as the first test batch
- run Phase 6A frontend/admin preview if available
- run Phase 7A/7B callable in `dryRun` mode for the same `ownerId + identifierKeys[]`
- verify dryRun returns expected candidates
- verify skipped/conflict/error counts are acceptable
- verify deterministic `observationId` values are stable between dryRun attempts
- do not execute if dryRun has unexpected errors or ambiguous skips

## Candidate selection policy

- first controlled execution should use at most 5 identifiers
- selected identifiers should be low-risk
- selected identifiers should have no real observations
- selected identifiers should have valid `identifier.createdAt`
- selected identifiers should be active or unassigned
- retired/lost/replaced identifiers should not be selected
- owner-wide execution is not allowed

## Dry-run request example

```json
{
  "mode": "dryRun",
  "ownerId": "<target-owner-id>",
  "identifierKeys": [
    "<identifier-key-1>",
    "<identifier-key-2>"
  ],
  "maxBatchSize": 5
}
```

## Execute request example

```json
{
  "mode": "execute",
  "ownerId": "<target-owner-id>",
  "identifierKeys": [
    "<identifier-key-1>",
    "<identifier-key-2>"
  ],
  "confirmationText": "CREATE_IMPORTED_OBSERVATIONS"
}
```

This execute payload is an example only and must not be run until manually approved.

## Expected execute behavior

- each candidate is revalidated server-side
- if valid, exactly one imported observation is created
- document path is `identifierObservations/{observationId}`
- existing documents are not overwritten
- conflicts are skipped
- failures are reported per identifier
- execution continues across the small batch where safe
- no other collections are updated

## Post-execution checklist

- record returned `created[]`
- verify `counts.created`
- verify each created `observationId` exists
- verify each created record has:
  - `ownerId`
  - `identifierKey`
  - `observerKind: "system"`
  - no `observerUid`
  - `source: "import"`
  - `observationType: "imported"`
  - `observedAt` as Timestamp copied from `identifier.createdAt`
  - `receivedAt` as server timestamp
  - `createdAt` as server timestamp
  - `metadata.migration.phase: "phase-7b"`
  - `metadata.migration.executedBy`
  - `metadata.migration.deterministicIdPayloadHash`
- verify identifiers/objects/bindings/events were not updated
- rerun diagnostics/dry-run checks
- confirm a repeated execute attempt skips existing deterministic observation IDs instead of overwriting

## Failure and rollback policy

- no automatic rollback
- imported observations are append-only migration records
- wrong records must be handled by explicit admin review
- repeated execution is intended to be idempotent through deterministic IDs and create-only writes
- if unexpected records are created, stop further batches and document findings before any remediation

## Phase 7C exit criteria

- runbook exists
- migration status updated
- AGENTS.md updated
- no production data was changed
- no function execution was performed
- no execute UI was added
- lint/build/functions build pass
- ready for a manually approved first controlled execution
