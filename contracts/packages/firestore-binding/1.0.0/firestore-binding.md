# Firestore Binding Contract (1.0.0)

This contract defines the strict binding mappings and persistence policies between logical Entity-Fact-Projection (EFP) schemas and physical Google Cloud Firestore document formats in **scan.mw**.

## 1. Type Mappings

### 1.1 Temporal Mapping (Time Representation)
* **Logical EFP Schema representation**: Standard RFC 3339 UTC formatted string (e.g., `2026-07-11T18:00:57.000Z`).
* **Firestore Persistence representation**: Firestore `Timestamp` class.
* **Conversion Mapping (Bidirectional)**:
  * **Inbound (Persistence -> Logical)**: 
    $$T_{logical} = \text{new Date}(T_{firestore}.\text{seconds} \times 1000 + T_{firestore}.\text{nanoseconds} / 1000000).\text{toISOString}()$$
  * **Outbound (Logical -> Persistence)**:
    $$T_{firestore} = \text{Timestamp.fromDate}(\text{new Date}(T_{logical}))$$

### 1.2 Spatial Mapping (Location Representation)
* **Logical EFP Schema representation**: Portable Coordinate Object:
  ```typescript
  interface PortableCoordinates {
    latitude: number;
    longitude: number;
  }
  ```
* **Firestore Persistence representation**: Firestore `GeoPoint` class.
* **Conversion Mapping (Bidirectional)**:
  * **Inbound (Persistence -> Logical)**:
    $$C_{logical} = \{ \text{latitude}: C_{firestore}.\text{latitude}, \text{longitude}: C_{firestore}.\text{longitude} \}$$
  * **Outbound (Logical -> Persistence)**:
    $$C_{firestore} = \text{new GeoPoint}(C_{logical}.\text{latitude}, C_{logical}.\text{longitude})$$

---

## 2. Collection Access & Writing Policies

### 2.1 Owner Identification Policy
* Every root Entity document (**Object**, **Marker**, **Place**) MUST define a top-level `ownerId` string matching the authenticated creator's UID.
* Any related child Fact document (**Association**, **Observation**, **Measurement**, **Event**) MUST reference owner-associated entities, which is validated by checking:
  1. The fact document contains the user's UID in its index arrays (e.g. `userIds`).
  2. Any entity referenced within the fact is verified to belong to the authenticated user.

### 2.2 Locked Legacy Collections
All legacy v1/migration collections are frozen. Writing (creation, modification, or deletion) via client SDKs is strictly disallowed to guarantee data integrity:
* `/items`
* `/identifiers`
* `/identifierObservations`
* `/objectIdentifierBindings`
* `/objectEvents`
* `/objectImages`

---

## 3. Strict Write Rules

* **Deny-by-Default**: Every Firestore collection matches deny-by-default, requiring explicit white-listed access.
* **Append-Only Facts**: Any Fact collection (`associations`, `observations`, `measurements`, `events`) allows client creation but strictly blocks updates or deletes by any client.
* **Projections Read-Only to Client**: `objectSummaries`, `markerSummaries`, and `placeSummaries` are read-only to ordinary clients. They are computed and written strictly via Cloud Functions / Admin SDK context.
* **Field Integrity**: No document may contain unknown or undocumented fields. Schema boundaries are checked at the Firestore rule level via key set enforcement (`keys().hasOnly()`).
