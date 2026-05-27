# Data Model Entity-Relationship Diagram

This document provides a comprehensive overview of the normalized data model used in this application. The schema is designed for Firebase Firestore, representing physical objects, their identifiers (like QR or NFC tags), media, and historical events.

## Mermaid ER Diagram

```mermaid
erDiagram
    objects ||--o{ objectIdentifierBindings : "has bindings"
    objects ||--o{ objectImages : "has images"
    objects ||--o{ objectEvents : "has events"
    objects ||--o{ identifierObservations : "has observations"
    identifiers ||--o{ objectIdentifierBindings : "bound via"
    identifiers ||--o{ objectEvents : "involved in"
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
        string createdBy
        string ownerUid
        string visibility "private | link_shared | community_visible | public_readable"
        timestamp lastReportedAt
        string lastReportedBy
        map lastReportedLocation
        string lastReportedPlaceLabel
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
        timestamp firstObservedAt
        string firstObservedBy
        string firstObservationId
        timestamp lastObservedAt
        string lastObservedBy
        string lastObservationId
        string lastObservedSource "Optional"
        string discoveryState "observed | registered | detached | unknown"
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
        string source "qr | nfc | manual | camera | system | migration"
        map location "latitude, longitude, address"
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
        map location "latitude, longitude, address"
        string note "Optional"
        map metadata "Optional"
        string visibility "private | linked_object | community | public"
        number schemaVersion "Optional"
        string observerKind "user | device | system"
        string observerUid "Optional (unless kind is user)"
        boolean observerIsAnonymous "Optional"
        string observerDeviceId "Optional"
    }
```

## Collections Description

- **`objects`**: Represents physical items being tracked. Contains descriptive data and summaries of identifiers.
- **`identifiers`**: Represents physical tags (like QR codes, NFC chips) that can be attached to objects.
- **`objectIdentifierBindings`**: Represents the active or historical canonical relationship between an object and an identifier.
- **`objectEvents`**: An append-only audit log recording operational history and events for objects and identifiers.
- **`objectImages`**: Represents media (images) associated with an object, including storage paths and metadata.
- **`identifierObservations`**: Represents loose evidence or records of an identifier being seen or scanned, which may exist before an object is registered or independently of canonical state.
