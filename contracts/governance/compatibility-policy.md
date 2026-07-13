# Compatibility Policy

This document defines how backward compatibility is handled for EFP models, data contracts, and public APIs in the `scan.mw` ecosystem.

## Data Schemas compatibility

- **Breaking Changes**: Changing field types, renaming fields, deleting fields, or changing `additionalProperties: false` structures in existing major versions of a JSON schema constitute breaking changes.
- **Compatible Changes**: Adding optional fields or expanding existing enum value sets (without breaking downstream clients) are considered backwards-compatible.

## Runtime Migration & Projections

Since projections are entirely derived from underlying Entities and Facts, the system guarantees that changing the EFP model or projection structure allows complete reconstruction of current states from historical Facts.
- No historical fact is mutated or destroyed due to client/schema upgrades.
- Projections (summaries) are treated as disposable and recomputable caches.
