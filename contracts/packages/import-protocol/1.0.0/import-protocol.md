# Import Protocol (v1.0.0)

This document specifies the mandatory protocol and lifecycle phases for executing data imports or migrations in scan.mw.

## Lifecycle Phases

All import operations MUST progress sequentially through the following phases:

### 1. Parse
- Read the raw backup file or incoming data stream.
- Deserialize raw JSON, XML, or binary format.

### 2. Format Validation
- Validate basic structure against the core payload schema (e.g. `export-format.schema.json`).
- Ensure metadata and required container fields are present.

### 3. Data Contract Validation
- Validate individual database documents and collections against their respective schemas in `efp-model` v2 (e.g. `object.schema.json`, `marker.schema.json`).

### 4. Referential Integrity Validation
- Verify participant references. Ensure any `EntityRef` within an Association, Observation, or Measurement exists in the collection or is part of the import transaction.

### 5. Import Plan Generation
- Formulate a precise, sequential set of database operations (inserts, updates, deletes) to achieve the target state.

### 6. Conflict Detection
- Detect duplicate IDs, unique key violations, or version mismatches against the current live database.

### 7. Dry-Run Report
- Output a comprehensive dry-run summary (statistics of inserts, updates, skips, and identified conflicts) without mutating live data.

### 8. Explicit Apply
- Commit the transaction to the database ONLY after manual administrative confirmation of the dry-run report.

### 9. Post-Import Reconciliation
- Automatically trigger EFP projection summaries recomputation on the affected entities to verify that live derived summaries match expectations.

## Controlled Administrative Import Exceptions

As a restricted baseline, the system supports Controlled Imported Observation Execution with the following strict constraints:

- **Executor is Admin Only**: Only authenticated users with matching records in `admins/{uid}` can invoke this operation. Unauthenticated or non-admin requests are strictly rejected.
- **Dry-Run vs. Execute Mode**:
  - `dryRun` evaluates the import source records, validates shapes, generates deterministic IDs, and reports the results back without writing anything to the database. (Supports up to 20 keys).
  - `execute` actually performs the creation in the target database. (Supports up to 5 keys).
- **Confirmation Requirement**: For `execute` mode, `confirmationText` must be exactly `"CREATE_IMPORTED_OBSERVATIONS"`.
- **Source Read Boundary**: Source data is retrieved strictly as read-only from `identifiers` and `identifierObservations`. No modifications (updates or deletions) are ever made to the legacy collections (`identifiers`, `items`, `objectIdentifierBindings`).
- **Write Target Boundary**: The ONLY allowed write target is `identifierObservations`. Existing records are never updated or overwritten.
- **Deterministic Identity**: Generated observation IDs must be deterministic (e.g., using UUIDv5 with a fixed namespace, a hash of the source identifier, and standard canonical JSON payload representation) ensuring dry-run and execute produce identical, reproducible IDs.
- **Idempotency & Conflict Safety**: Re-running the same input must not create duplicates. If an observation document already exists, the execution must safely skip it or mark it as a conflict/skipped without overwriting the existing data.
- **Manual Execution Only**: Production executions must never be automated or scheduled; they are manually requested by an authorized administrator via explicit calls.
