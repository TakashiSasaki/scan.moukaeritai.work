# Entity-Fact-Projection Data Model

Status: Draft design document  
Scope: Conceptual data model and Firestore collection mapping  
Implementation status: Documentation only

This document defines the proposed data model for `scan.moukaeritai.work` after moving away from an Identifier/Binding-centered model toward an Entity/Fact/Projection model.

The goal is to model objects, markers, and places as independent entities, and to represent relationships, observations, measurements, and application events as temporal facts. Derived current state is represented separately as projections or summaries.

This document is intentionally not a migration script and does not require immediate runtime changes. Existing collections such as `identifiers` and `objectIdentifierBindings` should be treated as legacy/current implementation details until a migration plan is written.

## 1. Core principles

The model is based on the following principles.

```text
1. Separate Entity and Fact.

2. Treat Entity records as mutually independent timeless nodes.

3. Store time-related domain information in Fact records, not Entity records.

4. Treat repeated marker reads and repeated positioning as time-series facts, not duplicate data to be normalized away.

5. Treat Summary / Projection records as derived read models, not as the source of truth.

6. Use Entity + Fact as the source of truth.

7. Ensure Summary / Projection records can be rebuilt from Facts.
```

## 2. Layer overview

The model has three conceptual layers.

```text
Entity layer:
  Object
  Marker
  Place

Fact layer:
  Association
  Observation
  Measurement
  Event

Projection layer:
  ObjectSummary
  MarkerSummary
  PlaceSummary
```

Entity records identify things that can be referenced over time. They do not carry domain time.

Fact records describe something that happened, was observed, was measured, was asserted, or was related over a period. Fact records carry time.

Projection records are derived from Facts to support UI, search, sorting, and efficient Firestore reads.

## 3. Entity layer

### 3.1 Object

An Object is a managed physical or conceptual item.

Examples:

- a book
- a laptop
- a key
- a cardboard box
- a tool
- a document folder

An Object does not have to have a Marker. An Object does not have to have a current Place. Those relationships are represented as Facts.

### 3.2 Marker

A Marker is a mark, signal, payload, native carrier ID, or other clue used to recognize, refer to, or rediscover something.

The term Marker replaces the previous conceptual use of Identifier. A Marker is not necessarily a globally stable unique identifier. Some markers are stable, some are semi-stable, some rotate, and some are only useful as observed evidence.

Examples:

- QR code
- NFC NDEF URL
- NFC native carrier ID
- FeliCa IDm
- ISO14443 UID
- ISO15693 UID
- RFID EPC
- RFID TID
- barcode value
- BLE beacon identity
- BLE advertisement-derived fingerprint
- manual code
- visual fingerprint

A Marker does not have to be attached to an Object. A Marker can exist before being associated with an Object, or can be observed without being promoted to a managed Marker.

### 3.3 Place

A Place is a named location or spatial context.

The collection name should be `places`, not `locations`, because the application is primarily concerned with user-meaningful places such as rooms, shelves, boxes, warehouses, vehicles, and areas. `Location` remains a broader conceptual term covering places, positions, and measurements.

Examples:

- home
- office
- warehouse
- room
- shelf
- box
- vehicle
- area

A Place can exist without any Object or Marker currently associated with it.

## 4. Fact layer

A Fact is a temporal node. It represents something that is true, observed, measured, or occurred at a time or during a period.

Facts may connect any number of participants. This means Facts should be treated as typed hyperedges rather than simple pairwise edges.

Examples of participant combinations:

```text
Object + Marker
Object + Marker + Marker
Object + Object
Object + Object + Place
Marker + Marker
Marker + Place
Object + Marker + Place
Marker + Reader + Place
```

### 4.1 Association

An Association is a relatively durable relationship among participants.

Examples:

- an Object has a Marker
- an Object is at a Place
- an Object is inside another Object
- an Object is part of another Object
- multiple Objects are grouped together
- multiple Markers are equivalent
- one Marker replaces another Marker
- a Place contains another Place
- a Marker is installed at a Place
- a Reader is installed at a Place

The previous `MarkerBinding` or `ObjectIdentifierBinding` concept should be modeled as a special case of Association:

```text
Association(type = "object_has_marker")
  participants:
    object: OBJ-123
    marker: MK-QR-001
```

### 4.2 Observation

An Observation records that something was seen, read, detected, or confirmed at a time.

Observation is not Marker-specific. It can represent a marker read, an object confirmation, a visual observation, or an inventory check.

Examples:

- a QR marker was scanned
- an NFC tag was read
- a FeliCa IDm was observed
- a BLE advertisement was seen
- an Object was visually confirmed
- an inventory check observed several Objects

### 4.3 Measurement

A Measurement records a value measured at a time.

Examples:

- GPS position
- manual place report
- BLE RSSI
- RFID read signal
- distance estimate
- proximity measurement
- signal strength

A Measurement can involve an Object, Marker, Place, Reader, Device, or any combination of them.

### 4.4 Event

An Event records an application-level or business-level occurrence.

Examples:

- object created
- object updated
- marker registered
- marker retired
- association created
- association ended
- summary recomputed
- data imported

Event is not the general container for all time-related information. Marker reads belong to Observation, positioning belongs to Measurement, and durable relationships belong to Association.

## 5. Projection layer

A Projection or Summary is a derived read model.

Projection records are not required for semantic completeness. They exist for application performance, UI convenience, sorting, filtering, search, and Firestore query efficiency.

```text
Source of truth:
  Entity + Fact

Derived read model:
  Summary / Projection
```

Projection records may contain derived timestamps such as `lastObservedAt` or `asOf`, but these are not Entity domain time fields. They are derived values or projection freshness indicators.

If a Summary conflicts with the underlying Facts, the Facts are authoritative.

## 6. Firestore collection layout

The proposed Firestore layout is:

```text
Entity collections:
  objects/{objectId}
  markers/{markerKey}
  places/{placeId}

Fact collections:
  associations/{associationId}
  observations/{observationId}
  measurements/{measurementId}
  events/{eventId}

Projection / cache collections:
  objectSummaries/{objectId}
  markerSummaries/{markerKey}
  placeSummaries/{placeId}

Support entity collections:
  readers/{readerId}
  devices/{deviceId}
```

Conceptually, `associations`, `observations`, `measurements`, and `events` are all Facts. They are separated into different physical collections because Firestore security rules, indexes, and UI queries are simpler when each major fact type has its own collection.

A single `facts/{factId}` collection is conceptually elegant, but it would make Firestore queries and rules more difficult. The recommended approach is:

```text
Logical model:
  Fact

Physical collections:
  associations
  observations
  measurements
  events
```

## 7. Common reference model

Fact records use participants. A participant is a role-qualified reference to an Entity or another Fact.

```ts
type EntityRef =
  | { entityType: 'object'; id: string }
  | { entityType: 'marker'; id: string }
  | { entityType: 'place'; id: string }
  | { entityType: 'reader'; id: string }
  | { entityType: 'device'; id: string }
  | { entityType: 'user'; id: string }
  | { entityType: 'association'; id: string }
  | { entityType: 'observation'; id: string }
  | { entityType: 'measurement'; id: string }
  | { entityType: 'event'; id: string };

type Participant = {
  role: string;
  ref: EntityRef;
};
```

Example:

```json
{
  "role": "marker",
  "ref": {
    "entityType": "marker",
    "id": "MK-QR-001"
  }
}
```

Roles are type-specific. For example, an `object_has_marker` Association usually has participants with roles `object` and `marker`. An RFID read Measurement may have `marker`, `reader`, and `place` participants.

## 8. Firestore query support fields

Firestore is not a graph database and does not support arbitrary joins or graph traversal. Fact records should therefore include denormalized index fields.

```ts
type FactIndexFields = {
  participantKeys: string[];

  objectIds?: string[];
  markerKeys?: string[];
  placeIds?: string[];
  readerIds?: string[];
  deviceIds?: string[];
  userIds?: string[];
};
```

`participantKeys` should use normalized strings:

```json
[
  "object:OBJ-123",
  "marker:MK-QR-001",
  "place:PLACE-SHELF-A"
]
```

These fields allow simple queries such as:

- all Facts involving an Object
- all Facts involving a Marker
- all Facts involving a Place
- all Associations for an Object
- all Observations for a Marker
- all Measurements involving a Reader

These fields are query support fields. They are not the conceptual source of truth. They must be derived from `participants` and kept consistent with it.

## 9. Provenance

Fact records should include provenance.

```ts
type FactProvenance = {
  source:
    | 'user_confirmed'
    | 'user_report'
    | 'marker_observation'
    | 'location_measurement'
    | 'trusted_reader'
    | 'system_inference'
    | 'admin_import'
    | 'migration'
    | 'import';

  confidence:
    | 'confirmed'
    | 'high'
    | 'medium'
    | 'low'
    | 'unknown';

  actorUid?: string;
  sourceFactIds?: string[];
};
```

Provenance distinguishes user-confirmed data, automatically observed data, inferred data, imported data, and migration output.

## 10. Time model

Domain time belongs to Facts, not Entities.

```text
Association:
  validFrom / validUntil

Observation:
  observedAt / receivedAt

Measurement:
  measuredAt / receivedAt

Event:
  occurredAt
```

Suggested time objects:

```ts
type AssociationTime = {
  validFrom?: Timestamp;
  validUntil?: Timestamp;
};

type ObservationTime = {
  observedAt: Timestamp;
  receivedAt?: Timestamp;
};

type MeasurementTime = {
  measuredAt: Timestamp;
  receivedAt?: Timestamp;
};

type EventTime = {
  occurredAt: Timestamp;
};
```

Entity records should not contain domain time fields such as:

```text
Object.createdAt
Object.updatedAt
Object.lastSeenAt
Object.currentLocationUpdatedAt
Marker.firstObservedAt
Marker.lastObservedAt
Place.lastUsedAt
```

If Firestore persistence metadata is needed, it should be isolated under `_meta` and treated as implementation metadata, not domain time.

```ts
type PersistenceMeta = {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  schemaVersion?: number;
};
```

## 11. Entity document shapes

### 11.1 objects/{objectId}

```ts
type ObjectDoc = {
  objectId: string;
  ownerId?: string;

  label?: string;
  description?: string;
  objectKind?: string;

  visibility?: 'private' | 'shared' | 'public';

  _meta?: PersistenceMeta;
};
```

Object records should not contain current location, last seen time, active marker count, or location update timestamps. Those belong to Facts or Summaries.

### 11.2 markers/{markerKey}

```ts
type MarkerDoc = {
  markerKey: string;
  ownerId?: string;

  medium:
    | 'visual_code'
    | 'nfc'
    | 'rfid'
    | 'bluetooth'
    | 'manual'
    | 'visual_recognition'
    | 'unknown';

  mediumSubtype?: string;

  payloadLayer:
    | 'encoded_payload'
    | 'native_carrier_id'
    | 'radio_signal'
    | 'connected_payload'
    | 'derived_fingerprint'
    | 'manual_input';

  payloadKind: string;

  canonicalPayload?: string;

  nativeId?: {
    kind:
      | 'iso14443_uid'
      | 'felica_idm'
      | 'iso15693_uid'
      | 'rfid_epc'
      | 'rfid_tid'
      | 'ble_public_address'
      | 'ble_random_static_address'
      | 'ble_resolvable_private_address'
      | 'ble_non_resolvable_private_address'
      | 'unknown';

    normalizedValue: string;
  };

  stability:
    | 'stable'
    | 'semi_stable'
    | 'rotating'
    | 'session'
    | 'derived'
    | 'unknown';

  privacy?: {
    trackingSensitive: boolean;
    userConsentRequired: boolean;
    allowBackgroundObservation: boolean;
  };

  _meta?: PersistenceMeta;
};
```

Marker records should not contain first observation time, last observation time, attached time, or registered time as domain fields. Those are Facts or derived Summary values.

### 11.3 places/{placeId}

```ts
type PlaceDoc = {
  placeId: string;
  ownerId?: string;

  label: string;

  placeKind?:
    | 'home'
    | 'office'
    | 'warehouse'
    | 'room'
    | 'shelf'
    | 'container'
    | 'vehicle'
    | 'area'
    | 'other';

  _meta?: PersistenceMeta;
};
```

Place hierarchy is represented as an Association, not as a field on Place.

Example:

```text
Association(type = "place_contains_place")
  participants:
    parent place: PLACE-ROOM-A
    child place: PLACE-SHELF-A
```

## 12. associations/{associationId}

Association records represent durable or semi-durable relationships.

```ts
type AssociationDoc = FactIndexFields & {
  associationId: string;

  associationType:
    | 'object_has_marker'
    | 'object_at_place'
    | 'object_in_object'
    | 'object_part_of_object'
    | 'objects_grouped'
    | 'markers_equivalent'
    | 'marker_replaces_marker'
    | 'place_contains_place'
    | 'marker_installed_at_place'
    | 'reader_installed_at_place'
    | 'custom';

  participants: Participant[];

  status:
    | 'active'
    | 'inactive'
    | 'superseded'
    | 'detached'
    | 'disputed'
    | 'archived';

  time?: AssociationTime;

  provenance: FactProvenance;

  note?: string;
  _meta?: PersistenceMeta;
};
```

Example: Object has Marker.

```json
{
  "associationType": "object_has_marker",
  "participants": [
    {
      "role": "object",
      "ref": { "entityType": "object", "id": "OBJ-123" }
    },
    {
      "role": "marker",
      "ref": { "entityType": "marker", "id": "MK-QR-001" }
    }
  ],
  "participantKeys": ["object:OBJ-123", "marker:MK-QR-001"],
  "objectIds": ["OBJ-123"],
  "markerKeys": ["MK-QR-001"],
  "status": "active",
  "time": {
    "validFrom": "..."
  },
  "provenance": {
    "source": "user_confirmed",
    "confidence": "confirmed"
  }
}
```

Example: multiple Objects grouped at a Place.

```json
{
  "associationType": "objects_grouped",
  "participants": [
    {
      "role": "object",
      "ref": { "entityType": "object", "id": "OBJ-001" }
    },
    {
      "role": "object",
      "ref": { "entityType": "object", "id": "OBJ-002" }
    },
    {
      "role": "place",
      "ref": { "entityType": "place", "id": "PLACE-SHELF-A" }
    }
  ],
  "participantKeys": [
    "object:OBJ-001",
    "object:OBJ-002",
    "place:PLACE-SHELF-A"
  ],
  "objectIds": ["OBJ-001", "OBJ-002"],
  "placeIds": ["PLACE-SHELF-A"],
  "status": "active",
  "provenance": {
    "source": "user_confirmed",
    "confidence": "confirmed"
  }
}
```

Example: two Markers are equivalent.

```json
{
  "associationType": "markers_equivalent",
  "participants": [
    {
      "role": "marker",
      "ref": { "entityType": "marker", "id": "MK-QR-001" }
    },
    {
      "role": "marker",
      "ref": { "entityType": "marker", "id": "MK-NFC-001" }
    }
  ],
  "participantKeys": [
    "marker:MK-QR-001",
    "marker:MK-NFC-001"
  ],
  "markerKeys": ["MK-QR-001", "MK-NFC-001"],
  "status": "active",
  "provenance": {
    "source": "user_confirmed",
    "confidence": "confirmed"
  }
}
```

## 13. observations/{observationId}

Observation records represent things that were seen, read, detected, or confirmed.

```ts
type ObservationDoc = FactIndexFields & {
  observationId: string;

  observationType:
    | 'marker_observed'
    | 'object_observed'
    | 'object_confirmed'
    | 'marker_and_object_observed'
    | 'inventory_check'
    | 'imported'
    | 'custom';

  participants: Participant[];

  time: ObservationTime;

  source:
    | 'camera'
    | 'web_nfc'
    | 'rfid_reader'
    | 'bluetooth_scan'
    | 'manual'
    | 'gateway'
    | 'import';

  payload?: {
    raw?: unknown;
    canonical?: string;
    payloadKind?: string;
  };

  provenance: FactProvenance;

  note?: string;
  _meta?: PersistenceMeta;
};
```

Example: Object confirmed without a Marker.

```json
{
  "observationType": "object_confirmed",
  "participants": [
    {
      "role": "object",
      "ref": { "entityType": "object", "id": "OBJ-123" }
    },
    {
      "role": "place",
      "ref": { "entityType": "place", "id": "PLACE-SHELF-A" }
    }
  ],
  "participantKeys": ["object:OBJ-123", "place:PLACE-SHELF-A"],
  "objectIds": ["OBJ-123"],
  "placeIds": ["PLACE-SHELF-A"],
  "time": {
    "observedAt": "..."
  },
  "source": "manual",
  "provenance": {
    "source": "user_confirmed",
    "confidence": "confirmed"
  }
}
```

Example: FeliCa IDm observed.

```json
{
  "observationType": "marker_observed",
  "participants": [
    {
      "role": "marker",
      "ref": { "entityType": "marker", "id": "MK-FELICA-001" }
    },
    {
      "role": "device",
      "ref": { "entityType": "device", "id": "DEVICE-PHONE-001" }
    }
  ],
  "participantKeys": [
    "marker:MK-FELICA-001",
    "device:DEVICE-PHONE-001"
  ],
  "markerKeys": ["MK-FELICA-001"],
  "deviceIds": ["DEVICE-PHONE-001"],
  "time": {
    "observedAt": "..."
  },
  "source": "web_nfc",
  "payload": {
    "payloadKind": "felica_idm",
    "canonical": "0123456789ABCDEF"
  },
  "provenance": {
    "source": "user_confirmed",
    "confidence": "confirmed"
  }
}
```

## 14. measurements/{measurementId}

Measurement records represent measured values.

```ts
type MeasurementDoc = FactIndexFields & {
  measurementId: string;

  measurementType:
    | 'location'
    | 'gps_position'
    | 'manual_place'
    | 'proximity'
    | 'ble_rssi'
    | 'rfid_read'
    | 'distance'
    | 'signal'
    | 'custom';

  participants: Participant[];

  time: MeasurementTime;

  position?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracyMeters?: number;
  };

  place?: {
    placeId?: string;
    label?: string;
  };

  signal?: {
    rssi?: number;
    txPower?: number;
    distanceEstimateMeters?: number;
    protocol?: string;
    readerId?: string;
    antennaId?: string;
    gatewayId?: string;
  };

  provenance: FactProvenance;

  note?: string;
  _meta?: PersistenceMeta;
};
```

Example: manual place measurement for an Object without a Marker.

```json
{
  "measurementType": "manual_place",
  "participants": [
    {
      "role": "object",
      "ref": { "entityType": "object", "id": "OBJ-123" }
    },
    {
      "role": "place",
      "ref": { "entityType": "place", "id": "PLACE-SHELF-A" }
    }
  ],
  "objectIds": ["OBJ-123"],
  "placeIds": ["PLACE-SHELF-A"],
  "participantKeys": ["object:OBJ-123", "place:PLACE-SHELF-A"],
  "time": {
    "measuredAt": "..."
  },
  "place": {
    "placeId": "PLACE-SHELF-A"
  },
  "provenance": {
    "source": "user_report",
    "confidence": "confirmed"
  }
}
```

Example: BLE RSSI measurement.

```json
{
  "measurementType": "ble_rssi",
  "participants": [
    {
      "role": "marker",
      "ref": { "entityType": "marker", "id": "MK-BLE-001" }
    },
    {
      "role": "reader",
      "ref": { "entityType": "reader", "id": "READER-GW-001" }
    },
    {
      "role": "place",
      "ref": { "entityType": "place", "id": "PLACE-ROOM-A" }
    }
  ],
  "markerKeys": ["MK-BLE-001"],
  "readerIds": ["READER-GW-001"],
  "placeIds": ["PLACE-ROOM-A"],
  "participantKeys": [
    "marker:MK-BLE-001",
    "reader:READER-GW-001",
    "place:PLACE-ROOM-A"
  ],
  "time": {
    "measuredAt": "..."
  },
  "signal": {
    "rssi": -71,
    "gatewayId": "READER-GW-001",
    "protocol": "ble"
  },
  "provenance": {
    "source": "trusted_reader",
    "confidence": "medium"
  }
}
```

## 15. events/{eventId}

Event records represent application-level or business-level occurrences.

```ts
type EventDoc = FactIndexFields & {
  eventId: string;

  eventType:
    | 'object_created'
    | 'object_updated'
    | 'object_archived'
    | 'marker_registered'
    | 'marker_retired'
    | 'association_created'
    | 'association_ended'
    | 'summary_recomputed'
    | 'imported'
    | 'custom';

  participants: Participant[];

  time: EventTime;

  provenance: FactProvenance;

  note?: string;
  _meta?: PersistenceMeta;
};
```

Responsibility split:

```text
Marker read:
  Observation

Position or signal measurement:
  Measurement

Durable relationship:
  Association

Application or business occurrence:
  Event
```

## 16. Summary documents

Summary reconstruction semantics are formally defined in [Projection Reconstruction Semantics](../migrations/projection-reconstruction-semantics.md).

### 16.1 objectSummaries/{objectId}

```ts
type ObjectSummaryDoc = {
  objectId: string;

  currentPlaceId?: string;

  currentPosition?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };

  activeMarkerKeys?: string[];

  lastObservedAt?: Timestamp;
  lastMeasuredAt?: Timestamp;

  asOf: Timestamp;

  derivedFromFactIds?: string[];
};
```

### 16.2 markerSummaries/{markerKey}

```ts
type MarkerSummaryDoc = {
  markerKey: string;

  relatedObjectIds?: string[];
  lastObservedAt?: Timestamp;
  lastObservedPlaceId?: string;

  recentObservationCount?: number;

  asOf: Timestamp;

  derivedFromFactIds?: string[];
};
```

### 16.3 placeSummaries/{placeId}

```ts
type PlaceSummaryDoc = {
  placeId: string;

  currentObjectIds?: string[];
  currentMarkerKeys?: string[];

  lastActivityAt?: Timestamp;

  asOf: Timestamp;

  derivedFromFactIds?: string[];
};
```

Summary records may be deleted and recomputed. They must not contain primary information that cannot be recovered from Entities and Facts.

## 17. Marker links and object deep links

New physical markers should use marker links rather than object deep links.

```text
/object/:objectId
  Direct object locator.
  Useful for navigation.
  Not the preferred physical marker payload.

/m/:markerToken
  Marker resolver link.
  Preferred standard for newly issued QR / NFC marker payloads.
```

`/object/:objectId` may remain supported for convenience. However, `objectId` should not be treated as the canonical Marker payload.

## 18. Repeated observations and measurements

Repeated reads of the same Marker or repeated measurements at the same Place are not duplicates. They are time-series evidence.

Example:

```text
Observation:
  marker MK-1 observed at PLACE-A at 10:00

Observation:
  marker MK-1 observed at PLACE-A at 10:05

Observation:
  marker MK-1 observed at PLACE-A at 10:10
```

From these Facts, the application may derive:

```text
lastObservedAt
lastObservedPlaceId
recentObservationCount
presenceConfidence
currentLocationEstimate
movement history
co-location
staleness
```

The raw Facts should be preserved unless retention policies explicitly say otherwise.

## 19. Naming policy

Recommended names:

```text
Object
Marker
Place

Association
Observation
Measurement
Event

Summary
Projection
Participant
Provenance
```

Names to avoid in the new conceptual model:

```text
Identifier
Semantic Identifier Identity
Binding
TagIdentity
ScanPayloadIdentity
Location as a collection name
```

The term `bind` may still be acceptable for UI operations or command names such as `bindMarkerToObject`. However, the persistent collection should be `associations`, not `bindings`.

## 20. Relationship to the current implementation

The current implementation and documentation still include concepts such as:

```text
identifiers
objectIdentifierBindings
objectEvents
IdentifierRecord
IdentifierObservationRecord
ObjectIdentifierBindingRecord
locations
```

In the new conceptual model, these should be mapped as follows:

```text
IdentifierRecord
  -> MarkerDoc

identifiers
  -> markers

ObjectIdentifierBindingRecord
  -> AssociationDoc with associationType = "object_has_marker"

objectIdentifierBindings
  -> associations

IdentifierObservationRecord
  -> ObservationDoc with observationType = "marker_observed"

objectEvents
  -> events

locations
  -> places
```

This document does not require immediate destructive migration. Existing collections may continue to exist during a transition period. A later migration plan should define how current records are mapped into the new collections and how compatibility reads are handled.

## 21. Invariants

The proposed model has the following invariants.

```text
1. Entity records do not contain domain time (e.g., createdAt, firstObservedAt). Domain time conceptually belongs to Fact or Projection records, not Entity directly.

2. Fact records contain domain time.

3. Object, Marker, and Place are independent Entity types.

4. Association is a typed hyperedge and may connect any number of participants.

5. Observation and Measurement are append-only evidence records unless retention policy says otherwise.

6. Event is an application-level or business-level occurrence, not the generic container for all time.

7. Summary is a derived projection and is not the source of truth.

8. Firestore denormalized index fields are query support fields, not conceptual identity.

9. Marker replaces Identifier as the domain term for marks, signals, payloads, and carrier IDs used for recognition or rediscovery.

10. Marker-to-Object relationships are Associations, not special Binding records.
```

## 22. Initial implementation scope

A safe initial implementation scope is:

```text
1. Add this design document.

2. Add new TypeScript types for the conceptual model without deleting legacy types.

3. Mark Identifier/Binding terminology as legacy in developer documentation.

4. Add compatibility mapping from current records to the new conceptual model.

5. Introduce new collections only after security rules, indexes, and migration scripts are planned.
```

Do not perform a destructive migration as part of the initial documentation step.

## 23. Summary

The new model separates timeless Entities from temporal Facts.

```text
Entity layer:
  Object
  Marker
  Place

Fact layer:
  Association
  Observation
  Measurement
  Event

Projection layer:
  Summary
```

Object, Marker, and Place are independent nodes. Association, Observation, Measurement, and Event are temporal fact nodes. They use role-qualified participants and can represent hyperedges connecting two or more entities or facts.

Summary documents are derived read models used for performance and UX. They are not required for semantic completeness and must be rebuildable from Entities and Facts.

This model gives the application a graph-like conceptual foundation while remaining implementable in Firestore through typed collections, denormalized participant indexes, and derived projections.
