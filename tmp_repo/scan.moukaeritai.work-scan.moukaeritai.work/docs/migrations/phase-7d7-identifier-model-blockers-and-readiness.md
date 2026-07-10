# Phase 7D.7 — Identifier model blockers and implementation readiness

## Scope

Phase 7D.7 is a **design/readiness phase**.

- Resolves remaining identifier model blockers before runtime implementation.
- Does **not** modify runtime TypeScript, Firestore rules, firebase blueprint, Cloud Functions, migration execution code, or Firestore data.
- May update documentation and package version only.
- Phase 7E remains blocked.

## Inputs from Phase 7D.6

Phase 7D.6 identified the following remaining blockers:

1. Bluetooth object binding semantics.
2. Raw legacy snapshot preservation policy.
3. Default behavior for missing `identitySchemaVersion` and `canonicalizationVersion`.
4. Whether `status` and `label` remain on global identifiers or move later.
5. Whether legacy `schemaVersion` remains alongside identity-specific versions.
6. Firestore rules transition strategy for optional/non-identifying `ownerId` and global identifiers.
7. Runtime code paths that cannot tolerate optional `ownerId` yet.

## Decision 1: Bluetooth object binding semantics

**Decision:** For the current legacy Bluetooth migration path, use `objectIdentifierBindings` now. Do not wait for future `identifierTargetBindings`.

- `identifierTargetBindings` remains future-only for non-object targets (location/container/group/gateway).
- Legacy Bluetooth tags in scope originate from legacy items/objects, so the immediate canonical relation target is object binding.
- `IdentifierRecord.objectId` must not be used as authoritative relationship state.

Implications:
- Bluetooth legacy migration dry-run/output may create or propose `objectIdentifierBindings` records.
- `linkedAt` may be used as candidate `attachedAt`/event timestamp.
- `rssi` remains observation metadata.
- `tagType` remains preserved legacy metadata and is excluded from identifier identity.

## Decision 2: Raw legacy snapshot preservation

**Decision:** Preserve raw legacy Bluetooth tag entries as migration provenance snapshots during dry-run/future migration output.

- Do not store full legacy snapshots inside canonical identifier identity.
- Do not include full legacy snapshots in UUIDv5 identity payload.
- `IdentifierRecord.rawPayload` may store minimal source payload relevant to canonicalization (optional, non-identifying).
- Full legacy source entries should be preserved under migration provenance/object legacy metadata/observation metadata as appropriate.

Clarification:
- `rawPayload`: optional, non-identifying identifier source payload for v2 runtime.
- Raw legacy snapshot/provenance: audit trail of source `items.bluetoothTags[]` data.
- Observation metadata: signal-specific operational data (`rssi`, scanner/gateway source, source timestamp).

## Decision 3: Missing identity version defaults

**Decision:**

- Missing `identityModelVersion` means legacy/current runtime interpretation (equivalent to v1).
- Missing `identitySchemaVersion` on existing records means legacy/non-v2 identity payload version was not explicitly recorded.
- Missing `canonicalizationVersion` on existing records means legacy/non-v2 canonicalization version was not explicitly recorded.
- New v2 identifier creation must set `identitySchemaVersion: 1` and `canonicalizationVersion: 1` explicitly.
- Missing `identitySchemaVersion` or `canonicalizationVersion` must not be silently treated as fully valid v2 unless handled by explicit compatibility branches.
- Any bulk backfill/defaulting for existing records must be a separate audited migration.

## Decision 4: `status` and `label`

**Decision:** Keep `status` and `label` on `IdentifierRecord` for the initial additive v2 transition.

- Both are treated as non-identifying operational metadata.
- Both are excluded from UUIDv5 payload.
- Do not introduce `identifierClaims` in this phase.
- Future phases may move user/community-specific labels or relationship-specific status semantics into claims/bindings, but this does not block Phase 7D.8.

Clarification:
- `IdentifierRecord.status` remains global/operational metadata for now.
- Binding-specific relationship state remains in `objectIdentifierBindings.status`.
- User-specific labels are not modeled in this phase.

## Decision 5: Legacy `schemaVersion`

**Decision:** Keep existing `schemaVersion?: number` for compatibility in additive transition.

- Do not remove it in this transition.
- Do not use `schemaVersion` for UUIDv5 payload structure.
- Prefer `identitySchemaVersion` for identifier semantic identity payload structure.
- Consider deprecating/renaming legacy `schemaVersion` only after runtime adoption in a later cleanup phase.

## Decision 6: Firestore rules transition strategy

**Decision:** Rules changes are deferred to a separate implementation phase after TypeScript/blueprint implementation plan acceptance.

Staged strategy:
1. Keep existing owner-scoped rules until runtime code paths are ready.
2. Add explicit handling for `identityModelVersion: 2` records in a future rules phase.
3. Permit only explicitly reviewed operations for global identifiers.
4. Keep ACL-specific semantics deferred.

Guardrails:
- Do not broadly open identifier reads/writes solely because current deployment is trusted community.
- Any rule broadening must be explicit, reviewed, and tested.

Open questions for the dedicated rules phase:
- Who can create a v2 global identifier?
- Who can update non-identifying metadata?
- Who can attach a global identifier to an object?
- How should owner-scoped legacy identifiers remain readable?
- How to prevent privilege expansion when `ownerId` is absent?

## Decision 7: Optional `ownerId` implementation strategy

**Decision:** Do not make `ownerId` optional in runtime TypeScript until call-site remediation is planned.

Phase 7D.8 should use staged implementation:
1. Add `JsonValue`, `rawPayload`, `identityModelVersion`, `identitySchemaVersion`, `canonicalizationVersion` to TypeScript.
2. Keep `rawValue` for compatibility.
3. Keep `objectId` as optional legacy-only compatibility field.
4. Decide whether `ownerId` optionalization is safe in the same PR only if call-site fixes are included and validated end-to-end.
5. Update firebase blueprint consistently.
6. Only then design and implement Firestore rules transition.

Preferred approach for 7D.8: additive fields first, and defer `ownerId` optionalization if unresolved runtime call-sites/rules/UI assumptions remain.

## Runtime implementation readiness matrix

| decision area | decision | implementation impact | remaining blocker? | target phase |
|---|---|---|---|---|
| `identityModelVersion` | Runtime interpretation metadata; exclude from UUID payload | Add additive field and compatibility handling for missing values | No (design resolved) | Phase 7D.8 |
| `identitySchemaVersion` | Required for new v2 creates (`1`); missing on legacy means non-v2 explicitness absent | Add field + explicit defaulting only on new v2 writes | No (design resolved) | Phase 7D.8 |
| `canonicalizationVersion` | Required for new v2 creates (`1`); missing on legacy means non-v2 explicitness absent | Add field + canonicalization policy handling | No (design resolved) | Phase 7D.8 |
| `rawPayload` | Optional non-identifying source payload | Add `JsonValue` + optional field; keep separate from provenance snapshots | No (design resolved) | Phase 7D.8 |
| `ownerId` | Optional/non-identifying in target model, but runtime transition staged | Call-site/rules/UI remediation required before optionalization | **Yes (implementation sequencing)** | Phase 7D.8+ |
| `objectId` | Legacy-only compatibility; non-authoritative for relation | Keep for compatibility; stop relying on it for canonical relation logic | No (design resolved, implementation work remains) | Phase 7D.8+ |
| `status` | Keep on `IdentifierRecord` as global operational metadata | No schema split required for initial additive transition | No | Phase 7D.8 |
| `label` | Keep on `IdentifierRecord` as non-identifying metadata | No claims/binding split required in initial additive transition | No | Phase 7D.8 |
| Bluetooth binding | Use `objectIdentifierBindings` for current legacy Bluetooth migration path | Align dry-run/mapping/output docs and future implementation | No | Phase 7D.8 / future migration implementation |
| Raw legacy snapshot | Preserve as provenance snapshot, not identifier identity | Ensure dry-run/migration outputs preserve source snapshots separately | No | Phase 7D.8 / migration phases |
| Firestore rules | Separate staged transition after runtime/type/blueprint readiness | Dedicated rules design/review/testing phase required | **Yes** | Post-7D.8 rules phase |
| firebase blueprint | Additive schema update aligned with TypeScript changes | Blueprint update required in implementation PR | **Yes (until implemented)** | Phase 7D.8 |
| deterministic UUID helper | Keep UUIDv5 + JCS payload policy | Verify helper usage aligns with decided identity fields | No (policy resolved) | Phase 7D.8 |
| `identifierKey` recomputation validation | Must remain recomputable from canonical identity payload | Add/verify deterministic payload construction tests/checks during implementation | **Yes (validation task)** | Phase 7D.8 |
| migration dry-run output | Must reflect provenance + binding decisions without execution | Update dry-run documentation/output schema expectations | No (design resolved) | Phase 7D.8 / migration phases |

## Phase 7D.8 recommendation

**Recommendation: B — additive TypeScript/blueprint implementation.**

Rationale: Phase 7D.7 resolves previously pending design blockers enough to proceed with bounded additive implementation.

Recommended 7D.8 scope:
- Additive TypeScript and `firebase-blueprint.json` changes only, if feasible in one scoped PR.
- No Firestore data writes.
- No migration execution.
- No Cloud Functions behavior change unless required only to fix compile/type coupling.
- No Firestore rules broadening unless explicitly included, reviewed, and tested as separate scope.
- Keep runtime behavior stable.
- Add helper/types for v2 canonical payload construction if safe.
- Run lint/build validation.

Phase 7E remains blocked.
