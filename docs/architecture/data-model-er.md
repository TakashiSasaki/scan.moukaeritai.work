# Data Model Entity-Relationship Diagram

This document provides a comprehensive overview of the normalized data model used in this application. The schema is designed for Firebase Firestore, representing physical objects, their identifiers (like QR or NFC tags), media, and historical events.

## Mermaid ER Diagram

```mermaid
erDiagram
    objects ||--o{ objectIdentifierBindings : "has bindings"
    objects ||--o{ objectImages : "has images"
    objects |o--o{ objectEvents : "has events"
    objects |o--o{ identifierObservations : "has observations"
    identifiers ||--o{ objectIdentifierBindings : "bound via"
    identifiers |o--o{ objectEvents : "involved in"
    identifiers ||--o{ identifierObservations : "observed via"

    objects {
        string objectId PK "Document ID"
        string ownerId
        string name
        string description
        string status "active | archived | lost | disposed"
        map currentLocation "latitude, longitude, address, updatedAt"
        string primaryImageId
        string primaryImageUrl
        map identifierSummary "activeKinds, activeIdentifierCount, hasQr, hasNfc"
        map legacy "sourceCollection, legacyItemId"
        string createdBy "Optional"
        string ownerUid "Optional"
        string visibility "Optional"
        timestamp lastReportedAt "Optional"
        string lastReportedBy "Optional"
        map lastReportedLocation "Optional"
        string lastReportedPlaceLabel "Optional"
        timestamp createdAt
        timestamp updatedAt
    }

    identifiers {
        string identifierKey PK "Document ID"
        string ownerId
        string objectId FK "Optional"
        string kind "qr | nfc | manual | barcode | bluetooth"
        string scheme "e.g., qr-url-token, nfc-uid"
        string rawValue "Optional"
        string canonicalValue
        string status "active | unassigned | retired | lost | replaced"
        string label "Optional"
        timestamp firstObservedAt "Optional"
        string firstObservedBy "Optional"
        string firstObservationId "Optional"
        timestamp lastObservedAt "Optional"
        string lastObservedBy "Optional"
        string lastObservationId "Optional"
        string lastObservedSource "Optional"
        string discoveryState "Optional"
        number schemaVersion "Optional"
        timestamp createdAt
        timestamp updatedAt
        timestamp lastSeenAt "Optional"
    }

    objectIdentifierBindings {
        string bindingId PK "Document ID"
        string ownerId
        string objectId FK
        string identifierKey FK
        string status "active | detached | replaced"
        timestamp attachedAt
        timestamp detachedAt "Optional"
        string attachedBy
        string detachedBy "Optional"
        string note "Optional"
        timestamp createdAt
        timestamp updatedAt
    }

    objectEvents {
        string eventId PK "Document ID"
        string ownerId
        string objectId FK "Optional"
        string identifierKey FK "Optional"
        string type "created | updated | scanned | located | image_added | image_removed | identifier_attached | identifier_detached | identifier_replaced | migrated"
        timestamp occurredAt
        string actorUid
        string source "Optional"
        map location "Optional"
        map metadata "Optional"
    }

    objectImages {
        string imageId PK "Document ID"
        string ownerId
        string objectId FK
        string role "primary | context | label | detail"
        string storagePath "Optional"
        string downloadUrl "Optional"
        string contentType "Optional"
        number sizeBytes "Optional"
        number width "Optional"
        number height "Optional"
        number sortOrder "Optional"
        timestamp createdAt
        string createdBy
        map legacy "sourceField, sourceUrl"
    }

    identifierObservations {
        string observationId PK "Document ID"
        string identifierKey FK
        string ownerId "Optional"
        timestamp observedAt
        timestamp receivedAt
        string source "nfc | qr | manual | barcode | ble | camera | gateway | import"
        string observationType "sighting | scan | proximity | gateway_seen | imported"
        timestamp createdAt
        string objectId FK "Optional"
        string placeLabel "Optional"
        map location "Optional"
        string note "Optional"
        map metadata "Optional"
        string visibility "Optional"
        number schemaVersion "Optional"
        string observerKind "user | device | system"
        string observerUid "Optional (unless observerKind is user)"
        boolean observerIsAnonymous "Optional"
        string observerDeviceId "Optional"
    }
```

## Collections Description

- **`objects`**: Represents physical items being tracked. Contains descriptive data and summaries of identifiers.
- **`identifiers`**: Represents physical tags (like QR codes, NFC chips) that can be attached to objects.
- **`objectIdentifierBindings`**: Represents the canonical active relationship state between an object and an identifier, NOT an append-only history table (history is recorded in `objectEvents`).
- **`objectEvents`**: An append-only audit log recording operational history and events for objects and identifiers.
- **`objectImages`**: Represents media (images) associated with an object, including storage paths and metadata.
- **`identifierObservations`**: Represents loose evidence or records of an identifier being seen or scanned, which may exist before an object is registered or independently of canonical state.
