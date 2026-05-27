# Database Structure

This document is the canonical source for the `scan.moukaeritai.work` database structure explanation. It describes the Firebase Firestore collections, their purposes, key fields, relationships, and the privacy/ownership model.

**Note:** This is documentation only. It does not provide a live database browser and contains no live data.

## Current Production Schema

The current database structure consists of the following collections:

### `objects`
- **Purpose:** Represents physical items or assets being tracked.
- **Ownership:** Owned by a user (`ownerId`).
- **Key Fields:**
  - `objectId`: Must equal the document ID.
  - `ownerId`
  - `name`
  - `description`
  - `status`: One of `active`, `archived`, `lost`, `disposed`.
  - `currentLocation`
  - `currentLocation.latitude`
  - `currentLocation.longitude`
  - `currentLocation.address`
  - `currentLocation.updatedAt`
  - `primaryImageId`
  - `primaryImageUrl`
  - `identifierSummary`
  - `identifierSummary.activeKinds`
  - `identifierSummary.activeIdentifierCount`
  - `identifierSummary.hasQr`
  - `identifierSummary.hasNfc`
  - `legacy`: Preserves legacy `items` provenance (e.g., `sourceCollection: 'items'`).
  - `createdBy`
  - `ownerUid`
  - `visibility`
  - `lastReportedAt`
  - `lastReportedBy`
  - `lastReportedLocation`
  - `lastReportedPlaceLabel`
  - `createdAt`
  - `updatedAt`

### `identifiers`
- **Purpose:** Represents scannable tags (e.g., QR codes, NFC tags) used to look up objects.
- **Ownership:** Owned by a user (`ownerId`).
- **Key Fields:**
  - `identifierKey`: Must equal the document ID.
  - `ownerId`
  - `objectId`: Optional, allowing unassigned identifiers to be representable.
  - `kind`: Current values are `qr`, `nfc`, `manual`, `barcode`, `bluetooth`.
  - `scheme`: Carries important type-specific semantics (e.g., "qr-url-token", "nfc-uid").
  - `rawValue`
  - `canonicalValue`: Carries important type-specific semantics.
  - `status`
  - `label`
  - `firstObservedAt`
  - `firstObservedBy`
  - `firstObservationId`
  - `lastObservedAt`
  - `lastObservedBy`
  - `lastObservationId`
  - `lastObservedSource`
  - `discoveryState`
  - `schemaVersion`
  - `createdAt`
  - `updatedAt`
  - `lastSeenAt`

### `objectIdentifierBindings`
- **Purpose:** Represents the canonical, active relationship between an object and an identifier. This collection is canonical relationship state, not history. It is currently object-only. Future generic target relationships are not implemented yet.
- **Ownership:** Scoped by the owner (`ownerId`).
- **Key Fields:**
  - `bindingId`: Must equal the document ID. Current canonical active binding ID convention is `${objectId}__${identifierKey}__active`.
  - `ownerId`
  - `objectId`
  - `identifierKey`
  - `status`
  - `attachedAt`
  - `detachedAt`
  - `attachedBy`
  - `detachedBy`
  - `note`
  - `createdAt`
  - `updatedAt`

### `identifierObservations`
- **Purpose:** Records explicit observations/scans of an identifier by a user. Observations are evidence/log records, not canonical object state. Client-created observations must remain limited by rules and should not imply backend/system ingestion is already available.
- **Ownership:** Owned by a user (`ownerId`). May be missing on older pre-ownerId observations, but new writes should include it.
- **Key Fields:**
  - `observationId`
  - `identifierKey`
  - `ownerId`
  - `observedAt`
  - `receivedAt`
  - `source`: Current values are `nfc`, `qr`, `manual`, `barcode`, `ble`, `camera`, `gateway`, `import`.
  - `observationType`: Current values are `sighting`, `scan`, `proximity`, `gateway_seen`, `imported`.
  - `createdAt`
  - `objectId`: Optional.
  - `placeLabel`
  - `location`
  - `note`
  - `metadata`
  - `visibility`
  - `schemaVersion`
  - `observerKind`
  - `observerUid`
  - `observerIsAnonymous`
  - `observerDeviceId`

### `objectEvents`
- **Purpose:** Provides an append-only operational history and audit log of events related to objects. Event types include created, updated, scanned, located, image_added, image_removed, identifier_attached, identifier_detached, identifier_replaced, migrated.
- **Ownership:** Scoped by the owner (`ownerId`).
- **Key Fields:**
  - `eventId`: Must equal the document ID.
  - `ownerId`
  - `objectId`
  - `identifierKey`
  - `type`
  - `occurredAt`
  - `actorUid`
  - `source`
  - `location`
  - `metadata`

### `objectImages`
- **Purpose:** Stores normalized images associated with objects.
- **Ownership:** Scoped by the owner (`ownerId`).
- **Key Fields:**
  - `imageId`: Must equal the document ID.
  - `ownerId`
  - `objectId`
  - `role`: Values are `primary`, `context`, `label`, `detail`.
  - `storagePath`
  - `downloadUrl`
  - `contentType`
  - `sizeBytes`
  - `width`
  - `height`
  - `sortOrder`
  - `createdAt`
  - `createdBy`
  - `legacy`: e.g., `legacy.sourceField` can preserve whether an image originated from `mainImageUrl` or `contextImageUrls`.

### `users`
- **Purpose:** Stores basic user profile information. Corresponds to the Firebase Auth UID. No live user data is documented here.

### `admins`
- **Purpose:** Defines which users have administrative capabilities. The document ID matches the user's UID. It is an admin marker/config collection. No live user data is documented here.

## Current schema limitations

The current production schema has several intentional limitations reflecting the staged rollout of the observation model:

- `objectIdentifierBindings` is object-only.
- There is no implemented `identifierTargetBindings` collection yet.
- There is no implemented `observationSets` collection yet.
- `IdentifierRecord.kind` currently includes `bluetooth`, but not `wifi_ap`, `ble_beacon`, `gateway`, or `sensor_node`.
- `ObservationSource` includes `ble` and `gateway`, but not `wifi`, `android_companion`, or `sensor_node`.
- Bluetooth legacy data is not yet migrated.
- `tagType` remains partially migrated / needs decision.
- Future radio/Wi-Fi/BLE metadata must be privacy-sensitive and likely backend/trusted-ingestion only.

## Design decisions pending before Phase 7E

Before completing the observation migration (Phase 7E), several critical design decisions must be resolved:

- Whether to implement Bluetooth legacy migration dry-run as Phase 7D.4 or keep it design-only longer.
- Whether `bluetoothTags[].id` maps to owner-scoped `identifiers(kind="bluetooth", scheme="bluetooth-legacy-tag-id")`.
- Whether to create only `objectIdentifierBindings` for legacy Bluetooth tags, or defer to future generic `identifierTargetBindings`.
- Whether to add `observationSetId` to `IdentifierObservationRecord` in a future additive schema phase.
- Whether to introduce `identifierTargetBindings` as a new collection.
- How to resolve `tagType`.
- Whether any legacy Bluetooth data should be preserved as raw legacy snapshot in addition to normalized records.

For the full breakdown of these design choices, see the [Database Design Decision Matrix](database-design-decision-matrix.md).

## Relationship Diagram

```text
users
  └─ owns ─ objects
              ├─ has images ─ objectImages
              ├─ has events ─ objectEvents
              └─ bound via ─ objectIdentifierBindings ─ identifiers
                                                     └─ observed by ─ identifierObservations

admins
  └─ grants admin capabilities
```
