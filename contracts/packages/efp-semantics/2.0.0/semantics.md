# EFP Semantics and Invariants (v2.0.0)

This document contains the upgraded normative invariants and semantic rules for the Entity-Fact-Projection (EFP) model in **scan.mw**.

## Core Rules

### 1. Separation of Entity and Fact
* **Rule**: Entities (`Object`, `Marker`, `Place`) represent timeless physical identities. Facts (`Association`, `Observation`, `Measurement`, `Event`) represent timestamped, append-only events or operations.
* **Invariant**: No Entity shall contain domain time properties directly in its core definition. All time-bound statements are exclusively stored on Facts.

### 2. Separation of Administrative Metadata and Domain Time
* **Rule**: Records carry administrative metadata (`recordCreatedAt`, `recordUpdatedAt`, `recordCreatedBy`, `recordUpdatedBy`, `schemaVersion`) solely for database auditing and physical schema tracking.
* **Invariant**: System-level administrative metadata must never be used to represent real-world events, measurement times, or scanning actions. These must rely on Fact domain times (e.g., `observedAt`, `effectiveAt`).

### 3. Reconstructibility of Projections
* **Rule**: Projections (`ObjectSummary`, `MarkerSummary`, `PlaceSummary`) are derived entirely from Entities and Facts.
* **Invariant**: The system can clear or delete all records in Projection collections and reconstruct them identically by replaying the Fact collections from the beginning of time. Projections are never the source of truth.

---

## Fact Semantics & Lifecycle

### 4. Immutable Association Fact Lifecycle
* **Rule**: Traditional interval-mutation (such as writing a `validUntil` field on an existing Association document) is strictly prohibited. All updates to object-marker-place link states MUST be recorded as new, append-only, immutable Association Facts.
* **Supported Operations**:
  * `attach`: Establishes a new link between an Object and a Marker.
  * `detach`: Terminates an existing link. Requires `subjectAssociationId` pointing to the prior `attach` Association Fact.
  * `replace`: Atomically replaces an existing link with a new Marker link. Requires `subjectAssociationId` pointing to the prior `attach` Association Fact.
* **Tie-Breaking Invariant**: In case of multiple facts recorded at the identical domain timestamp (`effectiveAt`), tie-breaking is resolved deterministically using lexicographical sorting of their unique, stable Fact IDs (`associationId`).

### 5. Backend-Only Fact Creation
* **Rule**: Direct client creation, modification, or deletion of Fact documents (`associations`, `observations`, `measurements`, `events`) is strictly banned.
* **Invariant**: Fact creation must be funneled entirely through the authenticated backend (Callable Functions), which enforces authorization checks, UUIDv7 generation, and indexes derivation.

---

## Marker Identity & Deterministic Key Semantics

### 6. Ownerless Marker Keys (Owner-Independent Identity)
* **Rule**: A physical Marker (like a QR code or an NFC tag) has a canonical identity derived solely from its hardware/carrier attributes (such as payload, medium, and scheme).
* **Invariant**: The generation of the unique deterministic `markerKey` MUST be completely independent of `ownerId`. 
  * If User A and User B scan the identical physical code, the generated `markerKey` MUST be identical.
  * However, for access control and privacy, a single Marker is owned by a single user at any given time (indicated by the `ownerId` field). A collision error is raised if a different user attempts to register/claim an existing Marker key.

### 7. Canonical Serialization Scheme
The input to the marker key generation is a canonical, sorted, key-value serialization of the marker's identity attributes:
1. `identityModelVersion`
2. `canonicalizationVersion`
3. `medium`
4. `payloadLayer`
5. `payloadKind`
6. `scheme` (use empty string if absent)
7. `canonicalPayload` (use empty string if absent)
8. `nativeIdKind` (use empty string if absent)
9. `canonicalNativeId` (use empty string if absent)

This canonical string is then hashed using standard SHA-256 and prefix-coded as `mk_<hex_or_base64url>`.
