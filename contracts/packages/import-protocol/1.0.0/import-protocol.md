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
