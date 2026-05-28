# Phase 7D.3: Bluetooth Legacy Migration Dry-run Design

## Scope

Phase 7D.3 designs a future read-only dry-run for migrating legacy `items.bluetoothTags`.

This phase is strictly **design-only**.
* no Firestore writes
* no migration execution
* no schema implementation
* no deployment
* no UI changes
* no Bluetooth migration execution yet

## Why this phase exists

* Phase 7D.1 confirmed `items.bluetoothTags` exists in live data.
* The current legacy migration does not map `bluetoothTags`.
* Phase 7D.2 established a generalized observable identifier / signal observation model.
* Phase 7D.3 translates that conceptual model into a concrete dry-run plan.
* Phase 7E must remain blocked until `bluetoothTags` and `tagType` decisions are closed.

## Source fields covered

This dry-run design must account for the following source fields:
* legacy item document ID
* `items.id`
* `items.ownerId`
* `items.createdAt`
* `items.updatedAt`
* `items.tagType`
* `items.bluetoothTags`
* `items.bluetoothTags[].id`
* `items.bluetoothTags[].name`
* `items.bluetoothTags[].rssi`
* `items.bluetoothTags[].linkedAt`

**Status:**
* `bluetoothTags[].id` and `bluetoothTags[].name` (non-identity metadata candidate) are confirmed present in live data.
* `bluetoothTags[].rssi` (observation metadata, non-identity) and `bluetoothTags[].linkedAt` (binding/event timestamp candidate, non-identity) were not observed in the available audit output, but the dry-run design must still define how to handle them if present.
* `tagType` must remain part of the decision analysis.

## Target model assumptions

Using the Phase 7D.2 four-layer conceptual model:
1. Identifier / Signal Source
2. Identifier Observation
3. Observation Set
4. Identifier Target Binding

For Phase 7D.3, the immediate dry-run target focuses on:
* proposed `IdentifierRecord` candidates for Bluetooth tags
* proposed object binding candidates for the legacy item/object relationship
* optional proposed observation candidates only if needed for completeness analysis
* no actual `observationSets` or `identifierTargetBindings` writes yet

Note: `identifierTargetBindings` and `observationSets` are future schema concepts and should not be implemented in this phase.

## Proposed Bluetooth identifier mapping

For each `items/{legacyItemId}.bluetoothTags[]` entry:

* create a proposed `IdentifierRecord`
* `kind = "bluetooth"`
* `scheme = "bluetooth-legacy-tag-id"` unless a better scheme is discovered
* `rawPayload` is optional provenance/snapshot data and not required for identity; `bluetoothTags[].id` maps to canonicalization input and `canonicalValue`
* `canonicalValue = canonicalized bluetoothTags[].id`
* `label = bluetoothTags[].name`, if present
* identity key is global.
* current schema still contains `ownerId`
* later implementation must decide whether `ownerId` is registrar/creator, moved to claims/bindings/observations, or handled by another additive structure
* no runtime schema change occurs in this task
* `objectId` should be treated carefully:
  * for backward compatibility, it may be proposed only if the legacy semantics imply direct attachment to the item/object
  * the design must not assume Bluetooth identifiers are always object-exclusive
  * note that long-term generic target binding may supersede direct `objectId`
* Current `IdentifierRecord.ownerId` is an implementation caveat; the conceptual model now treats identifiers as ownerless/global.
* `status = "active"` for attached legacy tags, unless conflict checks indicate otherwise
* `createdAt` candidate:
  * prefer `bluetoothTags[].linkedAt` (binding/event timestamp candidate, non-identity) if present and valid
  * otherwise use `items.createdAt`
* `updatedAt` candidate:
  * use `items.updatedAt` if present
  * otherwise use createdAt fallback

**Important:** Do not use the raw Bluetooth tag ID directly as a Firestore document ID. Bluetooth tag IDs may contain `/`, `=`, or other Firestore-ID-unsafe characters.

## Deterministic identifierKey design

The deterministic UUIDv5-based `identifierKey` design uses the existing application deterministic UUID namespace and the JSON Canonicalization Scheme (JCS).

We evaluated options for generating the UUIDv5 payload.

### Option A — include `legacyItemId` in the deterministic identifier payload:
* **Pros:**
  * simple one-item-to-one-proposed-identifier mapping
  * avoids accidental merging if legacy data reused tag IDs incorrectly
* **Cons:**
  * creates duplicate identifier records if the same physical Bluetooth tag appears under multiple legacy items
  * treats the item/tag association as part of the tag identity, which is conceptually wrong if the Bluetooth tag is the identifier/signal source
  * makes future multi-object, location, container, or group binding harder

### Option B — owner-scoped Bluetooth tag identity, without `legacyItemId`:
* **Pros:**
  * treats the Bluetooth tag itself as the identifier/signal source
  * allows the same tag to be associated with multiple objects, locations, containers, or groups through bindings
  * aligns with Phase 7D.2 observable identifier / signal model
  * avoids duplicate identifier records for the same tag under the same owner
* **Cons:**
  * requires stronger conflict reporting when the same tag appears under multiple legacy items
  * requires clear binding semantics

### Option C — global Bluetooth tag identity:
* **Pros:**
  * Bluetooth tag identity scope is global.
  * Same canonical tag maps to the same identifier across users.
  * Treats the Bluetooth tag strictly as a global identifier/signal source.
* **Cons:**
  * Cannot blindly create global publicly-readable identifiers; observations and bindings still need access policy.
  * Schema/implementation needs handling since current `IdentifierRecord` has `ownerId`.

**Recommendation:**
Use Option C. The deterministic identifier identity payload is JCS-canonicalized and includes:
* `idKind: "identifier"`
* `kind: "bluetooth"`
* `scheme: "bluetooth-legacy-tag-id"`
* `canonicalValue`
* app and namespace version metadata

* Bluetooth tag identity is global.
* `identifierKey` must be reproducible from `kind`, `scheme`, `canonicalValue`, and versioned namespace metadata.
* `ownerId` and `objectId` must not be part of the UUIDv5 identity payload.
* `legacyItemId` must not be part of the UUIDv5 identity payload.
* `ownerId` remains on observations, bindings, provenance, visibility, and access-control records. `ownerId` may appear in dry-run result context, binding candidates, observation candidates, and provenance, but not in identifier identity.
* `legacyItemId` remains in binding/provenance/dry-run output.

Example canonical JSON payload shape:
```json
{
  "app": "scan.moukaeritai.work",
  "idKind": "identifier",
  "identitySchemaVersion": 1,
  "canonicalizationVersion": 1,
  "kind": "bluetooth",
  "scheme": "bluetooth-legacy-tag-id",
  "canonicalValue": "<canonicalizedBluetoothTagId>"
}
```

## Canonicalization design

To canonicalize `bluetoothTags[].id`:
* trim whitespace
* preserve case unless evidence shows the ID is case-insensitive
* normalize Unicode to NFC if applicable
* represent the canonical value as a string
* do not decode base64 unless the legacy semantics are proven
* if preserving original entry snapshots, store them as provenance/snapshot data (e.g., optional `rawPayload`), not as identity payload
* store the canonicalized value as `canonicalValue`

The dry-run must report empty, missing, non-string, duplicate, or suspicious tag IDs.

## Proposed object binding mapping

Current legacy data places `bluetoothTags[]` inside an `items` document, implying the tag is associated with that item/object.

For each proposed Bluetooth identifier:
* propose an object binding between normalized objectId and proposed identifierKey
* current collection candidate: `objectIdentifierBindings`
* future conceptual collection: `identifierTargetBindings`
* `relationshipKind` should be documented conceptually as `"attached"` or `"associated"`, but not implemented in current `objectIdentifierBindings`
* `attachedAt` candidate:
  * prefer `bluetoothTags[].linkedAt` (binding/event timestamp candidate, non-identity) if present and valid
  * otherwise use `items.createdAt`
* `attachedBy` candidate:
  * use `items.ownerId` or migration actor placeholder, depending on existing binding conventions
* `status = "active"`

**Important:** The dry-run should make clear that this object binding is a legacy-derived proposal, not a general rule that Bluetooth tags are always object-exclusive. If duplicate tag IDs across items mean one identifier plus multiple bindings, this should be tracked.

## Proposed observation handling

* Do not create actual observations in Phase 7D.3.
* The dry-run may optionally report proposed observation candidates for completeness analysis.
* RSSI, if present, belongs in observation metadata, not in IdentifierRecord.
* If `linkedAt` exists, it is a candidate timestamp for bindings/events.
* If no event-level observation source exists, avoid inventing detailed observation history.

Bluetooth position/time data should normally live in `identifierObservations`, but legacy `bluetoothTags` may only provide attachment metadata, not true observation logs.

## Conflict and deduplication checks

The dry-run checks must detect and report:
* duplicate tag IDs across owners should map to the same global identifier.
* cross-user observations/bindings are separate records.
* conflict reports must distinguish identifier identity conflict from binding/claim conflict.
* existing identifiers with same global key must be checked globally.
* existing owner-scoped records must be handled through access policy.
* duplicate Bluetooth tag IDs within the same item
* duplicate Bluetooth tag IDs across different items under the same owner
* existing `identifiers` with the proposed identifierKey
* existing `identifiers` with same kind/scheme/canonicalValue but different key
* existing `objectIdentifierBindings` for the proposed object/identifier pair
* collisions with QR/NFC/manual/barcode identifiers
* missing ownerId
* missing or invalid legacy item document ID
* missing or invalid `bluetoothTags`
* missing or invalid `bluetoothTags[].id`
* non-string tag IDs
* non-string tag names
* invalid timestamps
* unsafe raw IDs
* duplicate canonical values after canonicalization

The dry-run must not treat conflicts as writes. It only reports them.

## Dry-run output shape

Suggested top-level fields (design sketch only):

```ts
interface BluetoothLegacyItemDryRunResult {
  legacyItemId: string;
  tagType?: string;
  candidates: {
    identifierKey: string;
    proposedRecord: any; // IdentifierRecord sketch
    proposedBinding: any; // Binding record sketch
  }[];
  conflicts: string[];
  warnings: string[];
  skippedReason?: string;
}

interface BluetoothLegacyMigrationDryRunResult {
  ownerId: string;
  scannedItemCount: number;
  scannedBluetoothTagCount: number;
  candidateIdentifierCount: number;
  candidateBindingCount: number;
  skippedCount: number;
  conflictCount: number;
  warningCount: number;
  items: BluetoothLegacyItemDryRunResult[];
  summary: {
    sourceFieldsCovered: string[];
    unmigratedGapsRemaining: string[];
    needsDecision: string[];
  };
}
```

## `tagType` Preliminary Analysis

* tagType is now decided: map and preserve in legacy metadata.
* Preserve raw and normalized values.
* tagType alone must not create identifiers.
* Dry-run must report tagType per item and proposed legacy metadata mapping.

## Source field classification update

Expected classifications after a future successful Bluetooth migration:
* `bluetoothTags`: `migrated` or `partially-migrated`
* `bluetoothTags[].id`: `migrated`
* `bluetoothTags[].name` (non-identity metadata candidate): `migrated`
* `bluetoothTags[].rssi` (observation metadata, non-identity): `derived-only` or `not-observed / observation-metadata-only`, depending on live data
* `bluetoothTags[].linkedAt` (binding/event timestamp candidate, non-identity): `migrated` if used as binding timestamp, otherwise `needs-decision`
* `tagType`: `migrated` or `partially-migrated` once raw/normalized legacy metadata mapping is implemented. (no longer `needs-decision` as a design matter, implementation validation still required)

## Privacy and safety

* Bluetooth tag IDs are potentially sensitive.
* global identity is adopted;
* observation/binding visibility remains controlled separately;
* global identity does not imply public location/RSSI/observation history;
* raw tag IDs should still be redacted in logs.
* Dry-run logs should redact, truncate, or hash raw IDs.
* No client-side writes should be added.

## Phase 7D.3 exit criteria

* dry-run design document exists
* deterministic ID strategy decided or narrowed
* canonicalization strategy documented
* conflict checks documented
* dry-run output shape documented
* Bluetooth legacy mapping proposed
* Phase 7E remains blocked
* no Firestore writes
* no migration executed
* no runtime schema implementation
* no deploy
