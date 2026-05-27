# Database Structure

This document is the canonical source for the `scan.moukaeritai.work` database structure explanation. It describes the Firebase Firestore collections, their purposes, key fields, relationships, and the privacy/ownership model.

**Note:** This is documentation only. It does not provide a live database browser and contains no live data.

## Current Production Schema

The current database structure consists of the following collections:

### `objects`
- **Purpose:** Represents physical items or assets being tracked.
- **Key Fields:** `objectId`, `name`, `description`, `ownerId`.
- **Ownership:** Owned by a user (`ownerId`).

### `identifiers`
- **Purpose:** Represents scannable tags (e.g., QR codes, NFC tags) used to look up objects.
- **Key Fields:** `identifierKey`, `kind`, `canonicalValue`, `ownerId`.
- **Ownership:** Owned by a user (`ownerId`).

### `objectIdentifierBindings`
- **Purpose:** Represents the canonical, active relationship between an object and an identifier.
- **Key Fields:** `bindingId`, `objectId`, `identifierKey`, `ownerId`, `active`.
- **Ownership:** Scoped by the owner (`ownerId`).

### `identifierObservations`
- **Purpose:** Records explicit observations/scans of an identifier by a user.
- **Key Fields:** `observationId`, `identifierKey`, `objectId`, `observedAt`, `source`, `ownerId`.
- **Ownership:** Owned by a user (`ownerId`). Direct client-created observations are restricted to ordinary user sighting/scan records.

### `objectEvents`
- **Purpose:** Provides an append-only operational history and audit log of events related to objects.
- **Key Fields:** `eventId`, `objectId`, `type`, `createdAt`, `ownerId`.
- **Ownership:** Scoped by the owner (`ownerId`).

### `objectImages`
- **Purpose:** Stores normalized images associated with objects.
- **Key Fields:** `imageId`, `objectId`, `url`, `createdAt`, `ownerId`.
- **Ownership:** Scoped by the owner (`ownerId`).

### `users`
- **Purpose:** Stores basic user profile information.
- **Key Fields:** `uid`, `email`, `displayName`.
- **Ownership:** Corresponds to the Firebase Auth UID.

### `admins`
- **Purpose:** Defines which users have administrative capabilities.
- **Key Fields:** `uid` (matching the user's UID).
- **Ownership:** System-level configuration.

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

## Future Design Concepts

The following concepts are **future designs** and are **not implemented** in the current production schema. They are documented here for architectural planning.

- `observationSets`: Grouping multiple related observations.
- `identifierTargetBindings`: Advanced binding structures.
- **Radio Observations (BLE / Wi-Fi / gateway / sensor / Android companion):** Passive or background observation mechanisms.

**Important regarding future concepts:**
- These concepts are not implemented unless separately added later.
- Radio/BLE/Wi-Fi data is highly privacy-sensitive and will require strict security and ownership controls if implemented.
