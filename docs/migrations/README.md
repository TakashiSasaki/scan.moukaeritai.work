# Migration archive

These documents are historical records only. They do not define active roadmap, PR closeout, release readiness, or runtime implementation requirements.

Current legacy classification:

- Legacy migration: Cancelled (no automatic or comprehensive migration is performed).
- Legacy dual-write: Cancelled.
- Legacy backfill: Cancelled.
- Legacy reconciliation: Cancelled.
- Legacy runtime integration: Cancelled.
- Legacy Firestore retention: Required.
- Legacy read-only access: Required.
- Legacy admin browser: Required.
- Legacy JSON export: Required.
- Legacy write prohibition: Required.

### Controlled Imported Observation Exception

Only when an administrator explicitly executes it, a controlled imported observation execution runs:
- **Read Source**: Legacy `identifiers` collection.
- **Write Target**: `identifierObservations` collection.
- **Rules**: Legacy collections are never updated or deleted. No automated, background, or scheduled migration is allowed. Same-input re-run does not overwrite or duplicate existing records.

Legacy data remains in existing Firestore legacy collections as a read-only archive. Admin browsing is allowed. JSON is the only supported export format. Do not create new migration phases, dual-write paths, shadow writes, backfills, canary writes, reconciliation workflows, or rollback frameworks from these archived notes.
