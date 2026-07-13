# Migration archive

These documents are historical records only. They do not define active roadmap, PR closeout, release readiness, or runtime implementation requirements.

Current legacy classification:

- Legacy migration: cancelled.
- Legacy dual-write: cancelled.
- Legacy backfill: cancelled.
- Legacy reconciliation: cancelled.
- Legacy runtime integration: cancelled.
- Legacy Firestore retention: required.
- Legacy read-only access: required.
- Legacy admin browser: required.
- Legacy JSON export: required.
- Legacy write prohibition: required.

Legacy data remains in existing Firestore legacy collections as a read-only archive. Admin browsing is allowed. JSON is the only supported export format. Do not create new migration phases, dual-write paths, shadow writes, backfills, canary writes, reconciliation workflows, or rollback frameworks from these archived notes.
