# Deprecation Policy

This document governs the deprecation and retirement of old, legacy data formats, vocabulary terms, and protocols in `scan.mw` v2.

## Legacy Term Deprecation

Terms used in version 1 of `scan.mw` are retired and replaced as follows:

| Legacy Term | v2 Replacement Term | Status |
| :--- | :--- | :--- |
| `Identifier` | `Marker` | Retired |
| `Binding` / `ObjectIdentifierBinding` | `Association` | Retired |
| `IdentifierObservation` | `Observation` | Retired |
| `locations` | `places` | Retired |

These legacy fields or records must not be introduced in any new schemas or runtime features.

## Deprecation Lifecycle

1. **Deprecated**: Active but marked with deprecation comments or warnings in code/schemas.
2. **Retired**: Removed from schema schemas but kept in deprecated parsing pathways or adapters.
3. **Purged**: Completely removed from code and adapter systems.
