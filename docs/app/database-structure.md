# Database Structure

This document is the canonical source for the `scan.moukaeritai.work` database structure explanation. It describes both the current production runtime schema and the target Entity / Fact / Projection model.

**Note:** This is documentation only. It does not provide a live database browser and contains no live data.

## 1. Target Conceptual Model

The long-term database architecture follows an Entity / Fact / Projection model:

- **Entity Collections:** Timeless identity nodes (e.g., `objects`, `markers`, `places`).
- **Fact Collections:** Temporal records containing domain time and operational history (e.g., `associations`, `observations`, `measurements`, `events`).
- **Projection Collections:** Derived, rebuildable read models summarizing state (e.g., `objectSummaries`, `markerSummaries`, `placeSummaries`).

## 2. Current Production Runtime Schema

The current runtime still relies on several legacy and transitional collections.

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

> Current runtime note:
> `ownerId` is currently present in `IdentifierRecord`, but this describes the current implementation field, not conceptual identifier ownership. Conceptually, identifier identity is ownerless/global. Future schema work will make `ownerId` optional and non-identifying while preserving compatibility with existing documents.
  - `objectId`: Optional, allowing unassigned identifiers to be representable.
  - `kind`: Current values are `qr`, `nfc`, `manual`, `barcode`, `bluetooth`.
  - `scheme`: Carries important type-specific semantics (e.g., "qr-url-token", "nfc-uid").
  - `rawValue`
  - `rawPayload`: Optional raw JSON payload for non-identifying data in v2 models.
  - `identityModelVersion`: Runtime interpretation version. 1 (default) or 2.
  - `identitySchemaVersion`: Schema version of the canonical identity payload. Defaults to 1 for v2.
  - `canonicalizationVersion`: Version of the JSON canonicalization algorithm. Defaults to 1 for v2.
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

## 3. Current-to-Target Mapping

| Current runtime | Target model |
| --- | --- |
| `identifiers` | `markers` |
| `objectIdentifierBindings` | `associations` |
| `identifierObservations` | `observations` |
| `objectEvents` | `events` |
| `objects.currentLocation` | `measurements` + `objectSummaries.currentPosition` |
| `objects.identifierSummary` | `objectSummaries` / `markerSummaries` |
| `objectImages` | `objectImages` for now; may later be represented by facts/events if needed |
| `items` | Legacy import source only |

## 4. Entity Collections

Entities are timeless identity nodes.
*(Note: Target collections are migration destinations unless already active in the current runtime).*

- `objects`: Represents physical items or assets being tracked. Currently active in production.
- `markers`: Target concept for physical, scannable tags used to look up objects. Currently represented in production by `identifiers`.
- `places`: Target concept for stable physical locations or zones.

## 5. Fact Collections

Facts are temporal, immutable records of events or states at a specific point in time.

- `associations`: Target concept representing bindings between entities (e.g., object to marker). Currently represented by `objectIdentifierBindings`.
- `observations`: Target concept for scans or encounters with a marker. Currently represented by `identifierObservations`.
- `measurements`: Target concept for telemetry or spatial measurements (e.g., GPS coordinates at a point in time). Currently partially handled via legacy `objects.currentLocation`.
- `events`: Target concept for operational audit logs. Currently represented by `objectEvents`.

## 6. Projection Collections

Projections are derived, easily queryable read models built from Facts and Entities.

- `objectSummaries`: Target read model for current object state (e.g., current position derived from measurements). Currently handled via denormalized fields like `objects.identifierSummary` and `objects.currentLocation`.
- `markerSummaries`: Target read model for current marker state.
- `placeSummaries`: Target read model for current place state.

## 7. Legacy / Compatibility Collections and Fields

The following collections and fields are part of the current runtime compatibility but are expected to map to the new Entity / Fact / Projection structure:

- `items`: Legacy import source for the previous object model.
- `objects.currentLocation`: Current runtime compatibility state representing the latest known position; conceptually maps to future `measurements` and `objectSummaries.currentPosition`.
- `objects.identifierSummary`: Current runtime denormalized state summarizing identifier presence; conceptually moving toward `objectSummaries` and `markerSummaries`.
- `identifiers`: Current runtime collection mapping to `markers`.
- `identifiers.ownerId`: Included in the current runtime for compatibility, but conceptually identifier identity is ownerless/global.
- `identifiers.objectId`: Legacy compatibility field, non-authoritative.
- `objectIdentifierBindings`: Current runtime collection mapping to `associations`.
- `identifierObservations`: Current runtime collection mapping to `observations`.
- `objectEvents`: Current runtime collection mapping to `events`.
- `legacy` fields: Embedded metadata fields (e.g., `objects.legacy`, `identifiers.legacy`) preserving import provenance and older schema values (such as `tagType`).

*(Historical Note: Planned concepts like `globalIdentifiers`, `identifierClaims`, `identifierTargetBindings`, and `observationSets` found in older design documents are future-only or historical design notes, not current runtime collections).*

## 8. Privacy, Ownership, and Compatibility Notes

- **Object Ownership:** `objects` are strictly owned by a user (`ownerId`).
- **Identifier Identity:** Conceptually, identifier identity (like a physical QR code or Bluetooth MAC) is global and ownerless. The current runtime `identifiers` collection retains `ownerId` for compatibility and scoped rules, but the target `markers` model will decouple global physical identity from private bindings.
- **Client Limitations:** Client-created observations must remain limited by rules and do not imply backend ingestion systems are available.

## 9. Migration Status

The system is undergoing a phased migration to the Entity / Fact / Projection model.
- Read/write paths in `Scanner` and `CaptureForm` still rely on the current runtime schema (`identifiers`, `objectIdentifierBindings`, etc.).
- See `docs/migrations/entity-fact-projection-runtime-migration-plan.md` for active phase details.

## 10. Relationship Diagram

```text
users
  └─ owns ─ objects (Entity)
              ├─ has images ─ objectImages
              ├─ has events ─ objectEvents (Fact)
              └─ bound via ─ objectIdentifierBindings (Fact / Association) ─ identifiers (Entity / Marker)
                                                                               └─ observed by ─ identifierObservations (Fact)

admins
  └─ grants admin capabilities
```
