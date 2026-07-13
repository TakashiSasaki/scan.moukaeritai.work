# Firestore Binding Contract (v2.0.0)

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

## 2. Collection Access & Mutation Policies

### 2.1 Owner Identification Policy
* Every root Entity document (**Object**, **Marker**, **Place**) MUST define a top-level `ownerId` string matching the authenticated creator's UID.
* Any related child Fact document (**Association**, **Observation**, **Measurement**, **Event**) MUST reference owner-associated entities.

### 2.2 Client Mutation Rules
* **Entities (Client-Writable with restrictions)**:
  * `objects`, `markers`, `places` are writable by their owners under strict validation rules (embedded ID must match document ID, `ownerId` must equal `request.auth.uid`, no schema spoofs).
* **Facts (Client-Read-Only, Backend-Only Mutation)**:
  * `associations`, `observations`, `measurements`, `events` are strictly read-only to their owners.
  * Direct client creations, updates, or deletes of Fact records are **fully denied**.
* **Projections (Client-Read-Only, Backend-Only Mutation)**:
  * `objectSummaries`, `markerSummaries`, `placeSummaries` are read-only to ordinary clients. They are computed and written strictly via Cloud Functions / Admin SDK context.
* **Command Receipts (Idempotency Helper)**:
  * `/factCommands/{commandId}` acts as the idempotency storage. Read/write is restricted to the backend Admin SDK context.

### 2.3 Locked Legacy Collections
All legacy v1/migration collections are frozen. Read or write via client SDKs is strictly disallowed:
* `/items`
* `/identifiers`
* `/identifierObservations`
* `/objectIdentifierBindings`
* `/objectEvents`
* `/objectImages`
