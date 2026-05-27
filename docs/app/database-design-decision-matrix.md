# Database Design Decision Matrix

This matrix registers design decisions required for the next phase of the database structure evolution, specifically handling Bluetooth legacy identifiers, observation grouping, and future generic bindings. It tracks items pending before migration Phase 7E.

See the [Database Structure](database-structure.md) document for the current production schema.

## Decision Matrix

| Decision | Current status | Options | Recommended next action | Blocks Phase 7E? | Source documents |
|---|---|---|---|---|---|
| Bluetooth tag identity scope | Decided | Global vs. Owner-scoped | Update Phase 7D.3 dry-run design and later implementation to use global deterministic Bluetooth identifier keys. Rationale: community observation model; same canonical tag should be one identifier across users. | No for design decision; Yes for implementation/rules validation | Phase 7D.2, Phase 7D.3 |
| Bluetooth tag document ID strategy | Decided | Raw ID vs. UUIDv5 | Use deterministic UUIDv5 identifier key. The payload must not include ownerId or legacyItemId. Collision checks are global. | No | Phase 7D.3, Deterministic UUID Policy |
| Bluetooth tag canonicalization | Decided | Implicit vs. Explicit `canonicalValue` | Define explicit scheme (e.g. `bluetooth-legacy-tag-id`). Applies before global key generation. | No | Phase 7D.3 |
| Bluetooth object binding semantics | Pending | `objectIdentifierBindings` vs. `identifierTargetBindings` | Decide if legacy Bluetooth tags should use object bindings or wait for generic target bindings. | Yes | Phase 7D.2, Phase 7D.3 |
| Bluetooth RSSI handling | Decided | Object attribute vs. Observation metadata | Keep RSSI in observation metadata only. | No | Phase 7D.3 |
| Bluetooth `linkedAt` handling | Decided | Discard vs. Map to binding timestamp | Use `linkedAt` as a candidate timestamp for bindings/events. | No | Phase 7D.3 |
| `tagType` handling | Decided | Map to identifier kind vs. Preserve in legacy metadata | Map and preserve in legacy metadata. Design exact fields under `ObjectRecord.legacy`, preserving raw and normalized values. Note: tagType alone must not create identifiers. | No for design decision; Yes for implementation mapping validation | Phase 7D.1 |
| Global Bluetooth visibility and access policy | Needs-decision | Public identifiers vs. Owner-scoped access vs. Explicit community policy | Design read/write visibility policy before implementation. | Yes, if global identifiers are written or exposed | New |
| `observationSetId` | Design-only | None vs. Add to `identifierObservations` | Defer to a future additive schema phase. | No | Phase 7D.2 |
| `observationSets` collection | Design-only | Implement vs. Defer | Future design, not implemented yet. | No | Phase 7D.2 |
| `identifierTargetBindings` collection | Design-only | Implement vs. Defer | Future design, not implemented yet. | Yes | Phase 7D.2 |
| Wi-Fi AP / BSSID support | Not started | Include in identifiers vs. Exclude | Defer implementation; data is highly privacy-sensitive. | No | Phase 7D.2 |
| BLE beacon vs generic Bluetooth kind | Not started | Distinct kinds vs. Unified | Defer implementation of specific beacon schema. | No | Phase 7D.2 |
| Gateway/sensor/Android companion ingestion | Not started | Client ingestion vs. Backend/trusted ingestion | Defer implementation; restrict to trusted backend paths due to privacy. | No | Phase 7D.2 |
| Radio data privacy and retention | Needs-decision | Indefinite vs. Ephemeral | Requires strict security boundaries and retention policies. | No | Phase 7D.2 |
| Raw legacy snapshot preservation | Pending | Normalized only vs. Save snapshot | Decide whether legacy Bluetooth data should also be saved as raw snapshots for audit. | Yes | Phase 7D.3 |
| Firestore rules impact | Needs-decision | Restrict vs. Broaden | Must maintain strict owner boundaries without broadening access unnecessarily. | Yes | Phase 7D.2 |
| TypeScript schema impact | Design-only | Add types vs. Defer | Will require updating `src/types.ts` once binding decisions are finalized. | Yes | Phase 7D.3 |
| Firebase blueprint impact | Design-only | Update vs. Defer | Will require updating `firebase-blueprint.json` corresponding to schema changes. | Yes | Phase 7D.3 |

## Related Documentation

- [Database Structure](database-structure.md)
- [Observation Model Migration](../migrations/observation-model-migration.md)
