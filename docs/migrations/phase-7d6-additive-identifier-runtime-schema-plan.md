# Phase 7D.6 — Additive identifier runtime schema implementation plan

## Scope

- This phase is **planning and audit only**.
- No runtime code, Firestore rules, firebase blueprint, Cloud Functions, deployment configuration, or migration execution paths are changed in this task.
- No Firestore reads/writes are added by this phase.
- The next implementation phase must not start until this plan classifies all affected fields and dependencies.

## Decisions carried forward from Phase 7D.5

- Existing `identifiers` collection remains the canonical identifier registry.
- No `globalIdentifiers` collection is introduced.
- `idPurpose` is removed from canonical identifier payload identity.
- `identityModelVersion` is introduced conceptually as runtime interpretation metadata.
- `scheme` remains part of semantic identifier identity.
- Future v2 design uses `rawPayload` (not `rawValue`) as optional non-identifying source payload.
- `ownerId` becomes optional and non-identifying in v2.
- `objectId` is legacy-only/non-authoritative for canonical relationship semantics.
- ACL fields and `identifierClaims` remain deferred.
- Bluetooth is a normal identifier with `kind = "bluetooth"` and Bluetooth-specific `scheme`.

## Current runtime schema snapshot

Current runtime `IdentifierRecord` in `src/types.ts` still represents the legacy/current model:

- `identifierKey: string`
- `ownerId: string` (required)
- `objectId?: string`
- `kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth'`
- `scheme: string`
- `rawValue?: string`
- `canonicalValue: string`
- `status: 'active' | 'unassigned' | 'retired' | 'lost' | 'replaced'`
- `label?: string`
- `firstObservedAt?: Timestamp`
- `firstObservedBy?: string`
- `firstObservationId?: string`
- `lastObservedAt?: Timestamp`
- `lastObservedBy?: string`
- `lastObservationId?: string`
- `lastObservedSource?: ObservationSource`
- `discoveryState?: IdentifierDiscoveryState`
- `schemaVersion?: number`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `lastSeenAt?: Timestamp`

This snapshot is current runtime state and **not** yet the ownerless/global v2 runtime schema.

## Proposed additive IdentifierRecord shape

```ts
export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface IdentifierRecord {
  identifierKey: string;

  ownerId?: string;   // optional, non-identifying, legacy/context only
  objectId?: string;  // optional, legacy compatibility only, non-authoritative

  kind: 'qr' | 'nfc' | 'manual' | 'barcode' | 'bluetooth';
  scheme: string;

  // legacy/current runtime field; keep readable for compatibility
  rawValue?: string;

  // v2 source payload field; non-identifying
  rawPayload?: JsonValue;

  canonicalValue: string;

  // v2 interpretation and identity payload version fields
  identityModelVersion?: 1 | 2;
  identitySchemaVersion?: number;
  canonicalizationVersion?: number;

  status: 'active' | 'unassigned' | 'retired' | 'lost' | 'replaced';
  label?: string;

  firstObservedAt?: Timestamp;
  firstObservedBy?: string;
  firstObservationId?: string;
  lastObservedAt?: Timestamp;
  lastObservedBy?: string;
  lastObservationId?: string;
  lastObservedSource?: ObservationSource;
  discoveryState?: IdentifierDiscoveryState;
  schemaVersion?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt?: Timestamp;
}
```

Additive transition notes:

- This shape is compatibility-preserving for existing documents.
- `ownerId` becomes optional but is not identity-defining.
- `rawValue` is retained initially for compatibility.
- `rawPayload` is added for v2 source payload support.
- `schemaVersion` may remain as existing general metadata if still referenced.
- `identityModelVersion` is distinct from `schemaVersion`.
- Missing `identityModelVersion` implies legacy/current interpretation (equivalent to v1).
- `identityModelVersion: 2` indicates ownerless/global identifier interpretation.

## Version semantics

- `identityModelVersion`
  - Runtime record interpretation metadata.
  - Stored in `IdentifierRecord`.
  - Not part of UUIDv5 identity payload.
- `identitySchemaVersion`
  - Version of the JCS identity payload structure.
  - Included in UUIDv5 payload.
- `canonicalizationVersion`
  - Version of canonicalization rules applied to the source value.
  - Included in UUIDv5 payload.
- Legacy `schemaVersion`
  - Existing generic schema metadata field.
  - Must not be confused with identity payload structure versions.

## Canonical identifier payload

```json
{
  "app": "scan.moukaeritai.work",
  "idKind": "identifier",
  "identitySchemaVersion": 1,
  "canonicalizationVersion": 1,
  "kind": "<qr|nfc|manual|barcode|bluetooth>",
  "scheme": "<scheme-name>",
  "canonicalValue": "<canonicalized-identifier-value>"
}
```

Explicitly excluded from UUIDv5 identity payload:

- `idPurpose`
- `identifierKey`
- `identityModelVersion`
- `rawPayload`
- `rawValue`
- `ownerId`
- `objectId`
- `legacyItemId`
- observer/actor fields
- binding target fields
- `label`
- `status`
- timestamps
- location
- RSSI
- visibility
- ACL fields
- migration provenance

## Source-to-target field classification audit

| current field | current meaning | proposed v2 treatment | classification | notes / risk |
|---|---|---|---|---|
| `identifierKey` | Doc ID and lookup key | Keep as canonical deterministic key | preserved | UUIDv5 payload migration strategy must remain deterministic |
| `ownerId` | Owner/scope field | Make optional, non-identifying contextual metadata | partially migrated | Many paths currently assume required ownerId |
| `objectId` | Legacy direct relation hint | Keep optional legacy compatibility only; canonical relation in bindings | preserved as legacy reference | New logic must not depend on it |
| `kind` | Identifier kind | Keep as identity field | preserved | Included in UUID payload |
| `scheme` | Kind-specific scheme | Keep as identity field | preserved | Included in UUID payload |
| `rawValue` | Legacy source string | Keep readable short-term for compatibility | preserved as raw snapshot | Long-term replacement with `rawPayload` |
| `canonicalValue` | Canonicalized identifier value | Keep as identity field | preserved | Included in UUID payload |
| `status` | Identifier lifecycle state | Keep for now; revisit for future claim/binding split | needs decision | Global-vs-binding semantics unresolved |
| `label` | Human-readable label | Keep for now; revisit location later | needs decision | Could move to claims/binding layer later |
| `firstObservedAt` | First observation timestamp | Keep | preserved | Observation consistency checks remain needed |
| `firstObservedBy` | First observer UID | Keep | preserved | Privacy/ACL future implications |
| `firstObservationId` | Link to first observation | Keep | preserved | Referential consistency risk if rules evolve |
| `lastObservedAt` | Last observation timestamp | Keep | preserved | |
| `lastObservedBy` | Last observer UID | Keep | preserved | |
| `lastObservationId` | Link to latest observation | Keep | preserved | |
| `lastObservedSource` | Last source type | Keep | preserved | |
| `discoveryState` | Observed/registered lifecycle hint | Keep | preserved | Ensure semantics remain compatible with v2 |
| `schemaVersion` | Legacy/general schema metadata | Keep temporarily, distinguish from identity versions | preserved as legacy reference | Naming confusion risk |
| `createdAt` | Created timestamp | Keep | preserved | |
| `updatedAt` | Updated timestamp | Keep | preserved | |
| `lastSeenAt` | Last seen timestamp | Keep | preserved | |
| `identityModelVersion` (new) | Runtime interpretation model marker | Add optional; missing/1=legacy, 2=ownerless/global | derived only | Defaulting behavior must be finalized |
| `identitySchemaVersion` (new) | Identity payload structure version | Add optional initially; include in UUID payload for v2 creation | derived only | Backfill/default strategy needed |
| `canonicalizationVersion` (new) | Canonicalization rule version | Add optional initially; include in UUID payload for v2 creation | derived only | Backfill/default strategy needed |
| `rawPayload` (new) | Non-identifying raw source payload JSON | Add optional | preserved as raw snapshot | Legacy snapshot policy still pending |

Implementation gating rule for this phase:

- If any field remains `needs decision` or `unmigrated gap`, runtime implementation in the next phase must not proceed until resolved.

## Runtime dependency audit

Audit method: static code search on `src/`, `functions/`, `firestore.rules`, `firebase-blueprint.json`, migration docs, and workflows.

| area/file | field or pattern | current usage | risk if field changes | proposed mitigation | blocks implementation? |
|---|---|---|---|---|---|
| `src/types.ts` | `IdentifierRecord.ownerId: string` | Required in type today | Optionalization causes compile and logic assumptions to break | Additive type change plus staged call-site remediation | Yes |
| `src/lib/identifierBindings.ts` | `existingId.ownerId !== uid` | Attach validation enforces owner equality | Optional ownerId can reject/ambiguous legacy/global records | Define v2 ownership/authorization policy for attach flow | Yes |
| `src/lib/identifierBindings.ts` | `existingId.objectId`, `existingId.status` | Idempotency and reassignment checks rely on direct identifier fields | Canonical relation already in bindings; direct objectId reliance is legacy | Transition checks to bindings-first policy | Yes |
| `src/lib/identifierObservations.ts` | `buildInitialIdentifierRecord` sets `ownerId`, `rawValue`, status fields | Unknown identifier bootstrap path assumes owner-scoped identifiers | Optional ownerId + rawPayload addition requires write-shape updates | Stage v2-aware creation policy in later implementation phase | Yes |
| `src/lib/identifierObservations.ts` | `existingId.ownerId !== userContext.uid` | Blocks mixed-owner/global interpretation | Breaks ownerless global behavior | Redesign conflict checks around bindings/claims | Yes |
| `src/lib/importedObservationDryRun.ts` | `where('ownerId','==',ownerId)` on identifiers | Owner-scoped migration dry-run behavior | Will exclude ownerless/global records | Keep as phase-specific scoped behavior or add explicit model branch later | No (for this planning phase) |
| `src/lib/observationDiagnostics.ts` | `where('ownerId','==',ownerId)` identifiers, checks `iden.objectId` | Diagnostics are owner-scoped and objectId-aware | Optional ownerId/global IDs may appear as anomalies | Add model-version-aware diagnostics in future phase | No |
| `src/lib/identifiers.ts` | key format `kind:scheme:canonicalValue` helper | Legacy key derivation helper diverges from UUIDv5 v2 strategy | Potential mismatch/confusion during transition | Introduce v2 UUID helper without breaking legacy reads | Yes |
| `functions/src/scanExecuteImportedObservationBatch.ts` | requires `identifierData.ownerId`; owner mismatch checks; reads `objectId` | Execution logic tightly owner-scoped | Optional ownerId records could be skipped/fail | Keep unchanged until explicit function migration phase | No (this task forbids function changes) |
| `functions/src/phase7dControlledDryRun.ts` | owner check, required fields include ownerId | Controlled dry-run assumes owner-scoped identifiers | Same as above | Keep unchanged until dedicated function phase | No |
| `firestore.rules` | owner-scoped access patterns (expected from current model) | Current security model likely assumes ownerId for identifiers | Optional ownerId/global docs could be unreadable/unwritable under old rules | Dedicated rules transition design phase required | Yes |
| `firebase-blueprint.json` | `identifiers` currently requires `ownerId`; includes `rawValue`/`objectId` model | Schema contract lags proposed v2 additive shape | Validation and docs drift if not updated later | Plan additive blueprint update in dedicated phase | Yes |
| `docs/* migrations` | references to owner-scoped logic and legacy fields | Documentation partially mixed between conceptual global and runtime owner-scoped | Implementation confusion risk | Keep migration docs synchronized per phase | No |

Key findings called out explicitly:

- Code paths currently assume `ownerId` is always present.
- Multiple queries filter identifiers by `ownerId`.
- Runtime behavior still reads `rawValue`.
- Some paths rely on `identifiers.objectId` for active status/object relation hints.
- Rules and blueprint are still aligned with owner-scoped assumptions.

## Firestore rules impact plan

No rules changes are made in this phase.

- Current runtime behavior is likely owner-scoped for identifier read/write.
- Optional `ownerId` and ownerless/global identifiers require future rules redesign.
- ACL-specific semantics remain deferred; this phase does not introduce ACL fields.
- Minimum questions for later phase (7D.7+):
  - How global identifier read permissions are constrained in trusted-community deployment.
  - Which writes are permitted for global identifiers and under which actor constraints.
  - How to authorize binding creation/update without requiring `identifiers.ownerId`.
  - How to prevent privilege expansion when ownerId is absent.

Required note:

- Trusted-community assumptions do **not** justify casual broadening of rules. Any rules broadening must be explicit, reviewed, and implemented in a separate phase.

## Firebase blueprint impact plan

No blueprint changes are made in this phase.

Expected future additive blueprint updates:

- Make `ownerId` optional in `identifiers`.
- Add `identityModelVersion`.
- Add `identitySchemaVersion`.
- Add `canonicalizationVersion`.
- Add `rawPayload`.
- Keep `rawValue` while runtime compatibility needs it.
- Preserve `objectId` as optional legacy-only compatibility field.

## TypeScript implementation plan

No TypeScript changes are made in this phase.

Future sequence:

1. Introduce `JsonValue` type.
2. Make `IdentifierRecord.ownerId` optional.
3. Add `identityModelVersion?: 1 | 2`.
4. Add `identitySchemaVersion?: number`.
5. Add `canonicalizationVersion?: number`.
6. Add `rawPayload?: JsonValue`.
7. Retain `rawValue?: string` for compatibility.
8. Retain `objectId?: string` as legacy-only compatibility.
9. Run `npm run lint`.
10. Inspect ownerId-related compile/runtime assumptions and update code in later implementation phase.

## Query migration plan

No query changes are made in this phase.

Future query evolution:

- Current owner-scoped patterns (e.g., `where('ownerId', '==', uid)`) must be audited endpoint-by-endpoint.
- Global identifier lookup should primarily use deterministic `identifierKey` resolution.
- Object relationships should be read from `objectIdentifierBindings` canonical state.
- New logic should not depend on `identifiers.objectId` as authoritative relation state.
- Additional composite indexes may be needed once mixed global/scoped query shapes are introduced.

## Bluetooth migration implications

- Bluetooth remains ordinary identifier kind: `kind = "bluetooth"`.
- Scheme example remains `bluetooth-legacy-tag-id`.
- `bluetoothTags[].id` is canonicalization and identity input.
- `name`, `rssi`, `linkedAt`, `tagType` are not identifier identity fields.
- RSSI belongs to observation metadata.
- `linkedAt` is a candidate binding/event timestamp.
- `tagType` should be preserved as legacy metadata, not identity input.
- Raw legacy snapshot preservation remains pending unless resolved in a dedicated policy phase.

## Remaining decisions before runtime implementation

Blocking/non-blocking decisions:

- **Blocking**: Bluetooth object binding semantics (`objectIdentifierBindings` now vs future `identifierTargetBindings`).
- **Blocking**: Raw legacy snapshot preservation policy.
- **Blocking**: Exact default behavior when `identitySchemaVersion` / `canonicalizationVersion` are missing.
- **Blocking**: Whether `status` and `label` stay on global identifier metadata or shift to binding/claim layers.
- **Blocking**: Whether legacy `schemaVersion` remains long-term alongside identity-specific versions.
- **Blocking**: Firestore rules transition strategy for optional ownerId/global IDs.
- **Blocking**: Any code path that cannot tolerate optional `ownerId` (identified in dependency audit).

## Phase 7D.6 exit criteria

- All current `IdentifierRecord` fields classified.
- All new v2 fields classified.
- `ownerId` dependency audit completed.
- `rawValue`/`rawPayload` dependency audit completed.
- `objectId` dependency audit completed.
- Firestore rules impact documented.
- Firebase blueprint impact documented.
- TypeScript implementation sequence documented.
- Unresolved blockers listed.
- No runtime changes made in this phase.
- Phase 7E remains blocked.
