# Phase 7D.10: Firestore Rules Stage 1 Additive Fields

**Status**: Completed
**Scope**: Narrow Firestore rules transition allowing Phase 7D.8 additive v2 identifier fields.

## Goals and Non-Goals

### Goals
- Implement Stage 1 Firestore rules allowance for strictly bounded additive identifier v2 fields.
- Document the rules-readiness and constraints of `rawPayload`, `identityModelVersion`, `identitySchemaVersion`, and `canonicalizationVersion`.
- Verify behavior through emulator acceptance and rejection tests.
- Increment root package version to reflect rules change.

### Non-Goals
- **No ownerless or global identifiers.** `ownerId` remains strictly required.
- **No imported or synthetic observation client writes.** Client rules still prohibit creating non-user observations.
- **No new `identifierClaims` or global identifier records.**
- **No ACL field additions.** Fields like `visibility`, `readers`, `writers`, `editors`, `allowedUserIds`, or `communityId` remain forbidden on identifiers.
- **No migration execution or production data writes.**
- **No deployment or changes to Cloud Functions/GitHub Actions.**
- **No changes to Phase 7E execution status (remains blocked).**

## Mandatory Audit Results

Prior to implementing changes, the current source-to-target status for relevant fields was audited:

| Field | Status | Notes |
| :--- | :--- | :--- |
| `rawPayload` | migrated | Introduced in Phase 7D.8 as optional JSON. Validated in rules strictly as `map`. |
| `identityModelVersion` | migrated | Introduced in Phase 7D.8. Validated in rules strictly as `1` or `2`. |
| `identitySchemaVersion` | migrated | Introduced in Phase 7D.8. Validated in rules strictly as `1`. |
| `canonicalizationVersion` | migrated | Introduced in Phase 7D.8. Validated in rules strictly as `1`. |
| `rawValue` | preserved-as-legacy-reference | Remains strictly allowed and unchanged. Not replaced by `rawPayload` in this task. |
| `ownerId` | partially-migrated | Remains required for `identifiers`. No ownerless support yet. |
| `objectId` | partially-migrated | Remains legacy/non-authoritative compatibility only. Canonical relation is `objectIdentifierBindings`. |
| `identifierKey` | migrated | Document ID, strictly enforced. |
| `kind`, `scheme`, `canonicalValue`, `status` | migrated | Unchanged in this phase. |

## Exact Rules Changes

### Old Behavior (Before Stage 1)
- Additive v2 fields (`rawPayload`, `identityModelVersion`, `identitySchemaVersion`, `canonicalizationVersion`) were actively rejected by the strict allowlist `hasOnly` checks in `firestore.rules`.
- Any attempt by the client to write these fields resulted in a `PERMISSION_DENIED` error.

### New Behavior (After Stage 1)
- **`rawPayload`**: Allowed as an optional `map`.
  - *Constraint Note:* While TypeScript allows `JsonValue` (which includes primitives and arrays), Firestore rules cannot easily validate deeply nested arbitrary shapes recursively. Stage 1 intentionally restricts `rawPayload` to a `map` only. Strings, numbers, booleans, and top-level arrays are rejected. It remains non-identifying and does not affect UUIDv5 semantic identity.
- **`identityModelVersion`**: Allowed optionally, strictly as number `1` or `2`.
- **`identitySchemaVersion`**: Allowed optionally, strictly as number `1`.
- **`canonicalizationVersion`**: Allowed optionally, strictly as number `1`.

All other constraints (including `ownerId` requirement, missing ACL fields, strict `hasOnly` boundaries) remain fully in effect.

## Emulator Test Strategy
The `firestore.rules.test.ts` suite was updated to ensure:
- **Acceptance:** Valid writes containing the additive v2 fields (with `rawPayload` as a map) succeed.
- **Rejection:**
  - `rawPayload` is rejected if it is a string, number, or array.
  - `identityModelVersion` is rejected if it is `0`, `3`, or a string like `"1"`.
  - `identitySchemaVersion` is rejected if it is `0`, `2`, or a string like `"1"`.
  - `canonicalizationVersion` is rejected if it is `0`, `2`, or a string like `"1"`.
  - `identifierClaims`, ACL fields, or missing `ownerId` writes continue to be strictly rejected.

## Rollback Plan
Since rules are declarative, if any unexpected issues arise, the rollback plan is simply to revert the `firestore.rules` and `tests/firestore-rules/firestore.rules.test.ts` changes to the prior commit (from Phase 7D.9). No data migration was performed, so no data remediation is necessary.

## Runtime Write-Path Alignment (Phase 7D.10 supplement)
As part of Phase 7D.10 completion, runtime write paths were conservatively aligned with Stage 1 fields:
- **Creation paths** (such as capturing new identifiers) now emit `identityModelVersion: 2`, `identitySchemaVersion: 1`, and `canonicalizationVersion: 1`.
- **Update paths** (such as attaching or detaching existing identifiers) intentionally **do not** backfill Stage 1 metadata onto older identifiers. Older identifiers without these fields remain valid legacy-compatible records.
- **`rawPayload`** is rules-allowed as a map but is intentionally omitted from runtime creation until a specific source payload policy is finalized.
- `rawValue` remains valid for legacy compatibility.
- `ownerId` remains required.
- `objectIdentifierBindings` remains the canonical relation.

## Phase 7E Status
Phase 7E (Migration Execution) remains strictly **blocked**. No imported observations can be written by clients, and no backend processes are activated in this phase.
