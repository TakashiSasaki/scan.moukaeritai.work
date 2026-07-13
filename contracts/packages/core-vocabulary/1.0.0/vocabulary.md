# Core Vocabulary (v1.0.0)

This document defines the official terms used within the scan.mw v2 application. All databases, APIs, schemas, and user interfaces must strictly adhere to these definitions.

## 1. Entities (Timeless nodes)

### Object
- **Definition**: A physical or conceptual asset, item, or piece of equipment tracked by the system.
- **Attributes**: `objectId`, `name`, `description`, administrative metadata.

### Marker
- **Definition**: A physical tagging medium or token that can be read or scanned. Replaces the legacy term `Identifier`.
- **Attributes**: `markerKey`, `medium` (visual, NFC, Bluetooth, manual), administrative metadata.

### Place
- **Definition**: A geographical location, building, room, bin, or custom-defined containment area. Replaces the legacy term `location`.
- **Attributes**: `placeId`, `label`, administrative metadata.

## 2. Facts (Temporal records)

### Association
- **Definition**: A temporal link or binding between two entities (most commonly an Object and a Marker). Replaces the legacy term `Binding` or `ObjectIdentifierBinding`.
- **Attributes**: `associationId`, `participants`, `time` (`validFrom`, `validUntil`).

### Observation
- **Definition**: An immutable record of scanning or witnessing a Marker or Object. Replaces the legacy term `IdentifierObservation`.
- **Attributes**: `observationId`, `participants`, `time` (`observedAt`, `receivedAt`).

### Measurement
- **Definition**: A recorded physical quantity or signal value (e.g. RSSI, GPS position, temperature) associated with an Entity or Fact.
- **Attributes**: `measurementId`, `participants`, `time` (`measuredAt`), coordinates or signal readings.

### Event
- **Definition**: An immutable log of transactional or lifecycle status changes (e.g., Object creation, Marker attachment).
- **Attributes**: `eventId`, `participants`, `time` (`occurredAt`).

## 3. Projections (Derived summaries)

### ObjectSummary
- **Definition**: A calculated state summarizing the current place, active markers, and last seen metrics for a specific Object.

### MarkerSummary
- **Definition**: A calculated state summarizing the current associated Object, last seen place, and recent scanner activities for a specific Marker.

### PlaceSummary
- **Definition**: A calculated state summarizing the current set of Objects and Markers located in or active within a specific Place.
