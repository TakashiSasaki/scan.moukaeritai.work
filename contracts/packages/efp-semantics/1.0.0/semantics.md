# EFP Semantics and Invariants (v1.0.0)

This document contains the normative invariants and semantic rules for the Entity-Fact-Projection (EFP) model in scan.mw.

## Core Rules

### 1. Separation of Entity and Fact
- **Rule**: Entities (`Object`, `Marker`, `Place`) are timeless, stateful nodes representing "nouns" in the system. Facts (`Association`, `Observation`, `Measurement`, `Event`) represent timestamped "verbs" or operations.
- **Invariant**: No Entity shall contain domain time properties (e.g. `observedAt`, `validFrom`). All time-bound statements are exclusively stored on Facts.

### 2. Separation of Administrative Metadata and Domain Time
- **Rule**: Records may carry administrative metadata (`recordCreatedAt`, `recordUpdatedAt`, `recordCreatedBy`, `recordUpdatedBy`, `schemaVersion`) solely for database auditing and physical schema tracking.
- **Invariant**: System-level administrative metadata must never be used to represent real-world events, measurement times, or scanning actions. These must rely on Fact domain times (e.g., `observedAt`, `validFrom`).

### 3. Reconstructibility of Projections
- **Rule**: Projections (`ObjectSummary`, `MarkerSummary`, `PlaceSummary`) are derived entirely from Entities and Facts.
- **Invariant**: The system can clear or delete all records in Projection collections and reconstruct them identically by replaying the Fact collections. Projections are never the source of truth.

### 4. Referential Integrity of Fact Participants
- **Rule**: Every participant listed inside a Fact record MUST point to a valid existing Entity.
- **Invariant**: Fact creation should be gated by validation verifying that the participant references (`EntityRef` of kind `object`, `marker`, `place`, etc.) exist in their respective collections.

### 5. Object-Marker Relationships
- **Rule**: The link between an Object and a Marker is represented as an `Association` Fact.
- **Invariant**: An Object cannot have direct references to Markers on its Entity record, nor can Markers point directly to Objects. The active association is determined by finding the active `Association` record with `status: "active"`.

### 6. Observations vs. Measurements
- **Rule**: The action of scanning a QR/NFC or detecting a signal is an `Observation`. Additional dimensions such as GPS coordinates, temperature, or signal strength (RSSI) are `Measurement` facts linked to that observation.
