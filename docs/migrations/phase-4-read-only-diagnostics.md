# Phase 4: Read-only Diagnostics

## Scope

This phase adds diagnostics to check the consistency and readiness of the data model following the introduction of observation logic in Phase 3. The diagnostics process is strictly read-only and bounded, intended only to provide a safe overview of database health for administrators.

## Non-goals

This phase explicitly **does not implement**:
- Data repair or automatic fixing of issues.
- Data backfill operations.
- Imported observations (Phase 6).
- Anonymous sign-in flows.
- Device/sensor ingestion.
- Provisional object workflow.
- Custody or loan model.
- Any form of production data mutation.

## Diagnostic checks

The diagnostic module (`src/lib/observationDiagnostics.ts`) implements the following bounded checks on a sample of records:

1. **`observation-id-mismatch`**: Verifies that the `observationId` inside an `identifierObservations` document matches the document ID.
2. **`observation-missing-identifier`**: Verifies that the identifier referenced by `identifierKey` in an observation actually exists.
3. **`observation-missing-object`**: Verifies that if an observation has an `objectId`, the corresponding object document exists.
4. **`observation-invalid-source` / `observation-invalid-type`**: Ensures that user-generated observations strictly avoid using sources or types reserved for device/import ingestion (e.g., `import`, `gateway`, `ble`).
5. **`identifier-missing-last-observation` / `identifier-missing-first-observation`**: Ensures that an identifier's denormalized observation references point to existing records.
6. **`identifier-unexpected-status` / `identifier-unassigned-has-object`**: Verifies logical consistency of identifier status rules (e.g. `observed` vs `unassigned`).
7. **`active-identifier-missing-canonical-binding` / `active-identifier-duplicate-bindings`**: Verifies that an active identifier with an `objectId` possesses exactly one active `objectIdentifierBindings` record.
8. **`binding-missing-identifier` / `binding-missing-object`**: Ensures canonical bindings do not contain dangling pointers.
9. **`object-identifier-summary-stale`**: Compares the stored `objects.identifierSummary` with a live computation based on current identifiers to detect staleness.

## Known limitations

- **Bounded/Sampled scans**: To avoid excessive read costs and performance impacts, the diagnostics scan is heavily bounded (e.g., max 50 records per collection).
- **Owner-scoped / Current-user scoped**: The current UI runs diagnostics for the current authenticated user / owner scope. It is not a full global database audit. Full global/admin diagnostics, if needed, are a later design item.
- **Missing vs. Inaccessible**: Depending on current Firestore security rules, some referenced documents might be unreadable. Diagnostics distinguish these and report them as inaccessible/unknown warnings rather than definite missing references.
- **No repair**: No issues surfaced by this tool will be repaired automatically. Full backfill and dry-run fixes remain as goals for Phase 5.

## How to use

Administrators can access the Observation Diagnostics tool directly from the **Admin Panel**.
1. Navigate to the Admin Panel.
2. Locate the "Observation Diagnostics" section.
3. Click "Run" to perform a bounded read-only scan.
4. The output displays counts of checked records along with structured warnings or error samples for analysis.

## Phase 4 exit criteria

- Diagnostics are completely read-only.
- Diagnostics can be run exclusively from the admin UI.
- Issue counts, summaries, and bounded samples are displayed clearly.
- No data writes or database mutations are performed.
- `npm run lint` and `npm run build` pass.
- No Phase 5+ work is implemented.