# Phase 7B: Limited Imported Observation Execute without UI

## Scope
Phase 7B enables a very limited, confirmation-gated backend execution mode for creating imported baseline observations using the `scanExecuteImportedObservationBatch` function. The primary goal is to allow backend-only creation of the deterministic baseline observations, validated entirely server-side.

## Non-goals
- **No UI:** Do not add execution controls to the `AdminPanel`, migration screens, or any web UI.
- **No other collection updates:** Do not update `identifiers`, `objects`, `objectIdentifierBindings`, or `objectEvents`.
- **No client writes:** Do not broaden Firestore rules for imported observation writes from ordinary clients.
- **No summary backfills or migrationRuns:** Do not update summary stats on objects or log runs to `migrationRuns`.

## Function Name
The function name remains `scanExecuteImportedObservationBatch`.

## No UI Execution
The execution is backend callable only. There are no UI modifications for executing this action.

## Request Shape
The payload expects:
- `mode`: `"dryRun"` or `"execute"`
- `ownerId`: The owner scope string
- `identifierKeys`: An array of identifier strings
- `confirmationText`: Must be exactly `"CREATE_IMPORTED_OBSERVATIONS"` (required for execute mode)

## Authorization
- Caller must be an authenticated admin (checked server-side via `admins/{uid}`).

## Execute Confirmation
Execution requires an explicit `confirmationText` of `"CREATE_IMPORTED_OBSERVATIONS"`. Without this, the request will be rejected.

## Batch Limits
- **Execute hard limit:** Maximum 5 identifier keys per request.
- **Dry-run limit:** Effective maximum 20.

## Server-side Revalidation
Every candidate is revalidated against Firestore data at the time of execution. The server checks for existing imported observations, real observations (bounded to 20), identifier status (`active` or `unassigned`), and deterministic ID conflicts before proceeding.

## Deterministic UUID Policy
- The deterministic ID namespace remains `e23891cf-81cd-4231-b750-836376f90efe`.
- The UUIDv5 payload strictly uses `migrationPhase: "phase-6a"` to preserve identity matching with previous dry-run previews.

## Actual Write Payload
For successful candidates, a document is created at `identifierObservations/{observationId}` containing:
- `observationId`
- `identifierKey`
- `ownerId`
- `observerKind: "system"`
- `observedAt: identifier.createdAt` (Firestore Timestamp copied from the source identifier)
- `receivedAt: admin.firestore.FieldValue.serverTimestamp()`
- `createdAt: admin.firestore.FieldValue.serverTimestamp()`
- `source: "import"`
- `observationType: "imported"`
- `visibility: "private"`
- `schemaVersion: 1`
- `metadata`

Note: Dry-run previews may still render `observedAt` as an ISO string for display purposes, but actual execute writes store a Firestore Timestamp.

Documents are created using `docRef.create()` to prevent overwrites.

## Metadata Schema
Execute mode writes actual metadata specifying:
- `migration.phase: "phase-7b"`
- `migration.executedBy: request.auth.uid`
- `deterministicIdPayloadHash`: A SHA-256 hash of the canonical JSON payload used to generate the UUID.

## No updates to Identifiers/Objects/Bindings/Events
This action is append-only for the `identifierObservations` collection and does not touch any other existing state.

## No migrationRuns Collection
Audit metadata is embedded inside the created observation record, not in a global logging collection.

## Deployment Safety
The GitHub Actions workflow deploy command remains explicit function-name allow-list. The new function is added explicitly to the deployment, alongside existing functions:
`npx --yes firebase-tools deploy --only "functions:getAppMetrics,functions:identifyMatches,functions:describeImage,functions:getClientIp,functions:migrateInventoryModel,functions:scanExecuteImportedObservationBatch" --project moukaeritaid --non-interactive`

Broad deployments (`--only functions`) are strictly not used.

## Pre-execute Checklist
- Confirm caller is admin.
- Validate `ownerId` and `identifierKeys`.
- Ensure batch size does not exceed limits.
- Confirm `confirmationText`.

## Post-execute Checklist
- Output structured response containing `counts`.
  - For execute mode: `created` and `counts.created`.
  - For dryRun mode: `candidates` and `counts.candidates`.
- `skipped`, and `errors`.
- Verify idempotent behavior handles repeated runs correctly (via conflict checks).

## Failure/Rollback Model
- There is no automatic rollback. Execution relies on full server-side revalidation per record, and documents are inserted individually. If an insertion fails or conflicts, it is added to `skipped` or `errors` without halting the entire batch.

## Phase 7B Exit Criteria
- `scanExecuteImportedObservationBatch` supports `execute` mode.
- Hard limit of 5 is enforced in `execute` mode.
- Server-side hashing (SHA-256) of deterministic payload is implemented.
- `metadata.migration.phase` is recorded as `phase-7b` during execute.
- No UI components for execution have been built.
- `package.json` version is updated to `1.7.3`.
