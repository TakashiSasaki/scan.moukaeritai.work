# Phase 7D.1: Legacy Items Field Coverage Audit

## Scope

This phase audits the source field coverage for legacy `items` before proceeding to Phase 7E final execution.

Important rules for this phase:
* Read-only operations only.
* No Firestore writes.
* No migration execution.
* No imported observation creation.
* No Bluetooth migration implementation yet.
* No deployment.

## Why this phase exists

During the review of the current migration strategy, it was identified that `items.bluetoothTags` (and possibly other fields like `items.tagType`) may not be mapped or fully covered by the legacy migration process. This suggests that other legacy fields might also remain unmapped. Phase 7E final execution must remain blocked until legacy source field coverage is thoroughly reviewed, properly classified, and safely handled to prevent any unintended data loss.

## Source-code field inventory

| legacy field path | source evidence | expected type | notes |
| --- | --- | --- | --- |
| `id` | `src/types.ts` (`LegacyItem`) | `string` | Legacy item ID |
| `name` | `src/types.ts` (`LegacyItem`) | `string` | |
| `description` | `src/types.ts` (`LegacyItem`) | `string` | |
| `ownerId` | `src/types.ts` (`LegacyItem`) | `string` | |
| `location` | `src/types.ts` (`LegacyItem`) | `object` | Optional |
| `location.latitude` | `src/types.ts` (`LegacyItem`) | `number` | |
| `location.longitude` | `src/types.ts` (`LegacyItem`) | `number` | |
| `location.address` | `src/types.ts` (`LegacyItem`) | `string` | Optional |
| `mainImageUrl` | `src/types.ts` (`LegacyItem`) | `string` | Optional |
| `contextImageUrls` | `src/types.ts` (`LegacyItem`) | `string[]` | |
| `bluetoothTags` | `src/types.ts` (`LegacyItem`) | `BluetoothTag[]` | Expected to be an array of objects |
| `bluetoothTags[].name` | `src/types.ts` (`BluetoothTag`) | `string` | |
| `bluetoothTags[].id` | `src/types.ts` (`BluetoothTag`) | `string` | |
| `bluetoothTags[].rssi` | `src/types.ts` (`BluetoothTag`) | `number` | Optional |
| `bluetoothTags[].linkedAt` | `src/types.ts` (`BluetoothTag`) | `Timestamp` | Optional |
| `tagType` | `src/types.ts` (`LegacyItem`) | `'qr' \| 'nfc' \| 'none'` | |
| `createdAt` | `src/types.ts` (`LegacyItem`) | `Timestamp` | |
| `updatedAt` | `src/types.ts` (`LegacyItem`) | `Timestamp` | |

## Existing migration mapping

| legacy field path | current migration target | current classification | evidence | decision/rationale |
| --- | --- | --- | --- | --- |
| document ID | `objects/{objectId}` | `migrated` | `functions/src/index.ts:311` (`objectId = legacyItemId.toUpperCase()`) | Mapped to normalized `objectId`. |
| `id` | `objects.legacy.legacyItemId` | `preserved-as-legacy-reference` | `functions/src/index.ts:395` | Original legacy ID kept for backward compatibility. |
| `name` | `objects.name` | `migrated` | `functions/src/index.ts:387` | Direct string map, falls back to empty string. |
| `description` | `objects.description` | `migrated` | `functions/src/index.ts:388` | Direct string map, falls back to empty string. |
| `ownerId` | `objects.ownerId`, `identifiers.ownerId`, `objectIdentifierBindings.ownerId`, `objectImages.ownerId` | `migrated` | Scattered across resources | Critical for ownership scoping. |
| `location` | `objects.currentLocation` | `migrated` | `functions/src/index.ts:400` | Mapped if lat/lng are numbers. |
| `location.latitude` | `objects.currentLocation.latitude` | `migrated` | `functions/src/index.ts:399` | Required property of location. |
| `location.longitude` | `objects.currentLocation.longitude` | `migrated` | `functions/src/index.ts:399` | Required property of location. |
| `location.address` | `objects.currentLocation.address` | `partially-migrated` | `functions/src/index.ts` assigns `objectData.currentLocation = item.location` when lat/lng are numeric | `address` is preserved when parent location passes numeric lat/lng validation. Live-data audit should verify if address-only or invalid-location cases exist. |
| `mainImageUrl` | `objects.primaryImageUrl`, `objectImages` (role='primary') | `migrated` | `functions/src/index.ts:404,454` | Mapped and normalized into `objectImages`. |
| `contextImageUrls` | `objectImages` (role='context') | `migrated` | `functions/src/index.ts:482` | Array iterates to individual images. |
| `bluetoothTags` | N/A | `unmigrated-gap` | Not mapped in `functions/src/index.ts` | Complete drop of physical hardware identifiers. |
| `bluetoothTags[].name` | N/A | `unmigrated-gap` | Not mapped | |
| `bluetoothTags[].id` | N/A | `unmigrated-gap` | Not mapped | |
| `bluetoothTags[].rssi` | N/A | `unmigrated-gap` | Not mapped | |
| `bluetoothTags[].linkedAt` | N/A | `unmigrated-gap` | Not mapped | |
| `tagType` | `objects.identifierSummary` / implicit QR creation | `partially-migrated` | `functions/src/index.ts:379` | Migration forces `{ activeKinds: ['qr'], hasQr: true, hasNfc: false }` regardless of `tagType`. |
| `createdAt` | `objects.createdAt`, `identifiers.createdAt`, `objectIdentifierBindings.attachedAt`, `objectImages.createdAt` | `migrated` | Scattered across resources | Used extensively as creation timestamp fallback. |
| `updatedAt` | `objects.updatedAt`, `identifiers.updatedAt`, `objectIdentifierBindings.updatedAt` | `migrated` | Scattered across resources | |

## Conditional mapping to verify in live data

* `location.address` (Verify if address-only or invalid lat/lng locations exist)

## Suspected gaps

* `bluetoothTags`
* `bluetoothTags[].id`
* `bluetoothTags[].name`
* `bluetoothTags[].rssi`
* `bluetoothTags[].linkedAt`
* `tagType`

## Possible decisions for bluetoothTags

* migrate to `identifiers(kind="bluetooth")`
* create corresponding `objectIdentifierBindings`
* preserve raw data under a legacy snapshot field
* intentionally discard with documented rationale
* defer Bluetooth support to a future migration

*Note: Raw Bluetooth tag IDs may contain Firestore-ID-unsafe characters such as `/` or `=`, so they must not be used directly as document IDs.*

## Possible decisions for tagType

* legacy UI hint only
* source identifier type hint
* redundant with generated QR identifier
* should be preserved in legacy metadata
* should be intentionally discarded with explicit rationale
* needs decision

## Live-data audit result

*Scanned 2 legacy items. The following expected fields were observed:*
- `id`
- `name`
- `description`
- `contextImageUrls`
- `bluetoothTags`
- `bluetoothTags[]`
- `bluetoothTags[].name`
- `bluetoothTags[].id`
- `tagType`
- `mainImageUrl`
- `location`
- `location.latitude`
- `location.longitude`
- `location.address`
- `ownerId`
- `createdAt`
- `updatedAt`

*Note on array traversal:*
`bluetoothTags[].rssi` and `bluetoothTags[].linkedAt` were not observed in the available audit output. However, because the audit harness array traversal may be representative rather than exhaustive, optional fields inside later array elements may require a stronger audit before making final decisions based purely on their absence. This does not affect the conclusion that `bluetoothTags`, `bluetoothTags[].id`, and `bluetoothTags[].name` exist in live data and remain migration decision items. No unexpected source fields were observed within the current audit limits. `bluetoothTags` and `tagType` remain decision items.

## Phase 7E blocking status

Phase 7E remains blocked until this audit is reviewed and decisions are made for all `unmigrated-gap` and `needs-decision` fields.

## Phase 7D.1 exit criteria

* audit document exists
* source-code field inventory completed
* current migration mapping completed
* suspected gaps listed
* live-data audit workflow/harness added or explicitly deferred
* migration status updated
* AGENTS.md updated
* general migration checklist added
* no production data changed
* no migration executed
* no execute UI added
* lint/build/functions build pass
