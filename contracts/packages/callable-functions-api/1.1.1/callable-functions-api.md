# Callable Functions API Contract (v1.1.1)

This contract defines the strict API specification for the backend-only immutable Fact creation pipeline in **scan.mw**.

## 1. API Endpoints

All endpoints are implemented as Firebase Gen 2 HTTPS Callable Functions.

### 1.1 `submitFactCommand`
Creates an immutable Fact (Association, Observation, Measurement, or Event) on behalf of the authenticated user.

* **Authentication**: Required. The caller must be a registered, authenticated user.
* **Idempotency**: Strictly enforced via the `commandId` parameter. Duplicate commands are rejected or return the cached receipt.
* **Request Payload Schema**:
  ```typescript
  interface SubmitFactCommandRequest {
    commandId: string; // Client-provided unique request identifier (strictly UUIDv4 format)
    factType: "association" | "observation" | "measurement" | "event";
    
    // The raw data block conforming to the corresponding efp-model v3.0.0 logical schema
    // Note: ID, ownerId, indexing arrays, and _meta are omitted by the client. 
    // They are injected or derived deterministically by the backend.
    data: any; 
  }
  ```
* **Specific Data Shapes expected from Client**:
  * For `"association"`:
    ```typescript
    interface AssociationClientData {
      operation: "attach" | "detach" | "replace";
      participants: Array<{ role: string; ref: { entityType: string; id: string } }>;
      effectiveAt: string; // RFC 3339 string
      subjectAssociationId?: string | null;
      note?: string;
    }
    ```
  * For `"observation"`:
    ```typescript
    interface ObservationClientData {
      participants: Array<{ role: string; ref: { entityType: string; id: string } }>;
      observationType: string;
      time: { observedAt: string; receivedAt?: string };
      provenance: { source: string; confidence: string };
      source?: string;
      note?: string;
      payload?: any;
    }
    ```
  * For `"measurement"`:
    ```typescript
    interface MeasurementClientData {
      participants: Array<{ role: string; ref: { entityType: string; id: string } }>;
      measurementType: string;
      time: { measuredAt: string; receivedAt?: string };
      provenance: { source: string; confidence: string };
      position?: { latitude: number; longitude: number; altitude?: number; accuracyMeters?: number };
      place?: { placeId?: string; label?: string };
      signal?: { rssi?: number; txPower?: number; distanceEstimateMeters?: number; protocol?: string };
      note?: string;
    }
    ```
  * For `"event"`:
    ```typescript
    interface EventClientData {
      participants: Array<{ role: string; ref: { entityType: string; id: string } }>;
      eventType: string;
      time: { occurredAt: string; receivedAt?: string };
      provenance: { source: string; confidence: string };
      note?: string;
    }
    ```

* **Response Payload Schema**:
  ```typescript
  interface SubmitFactCommandResponse {
    success: boolean;
    factId: string; // The newly generated UUIDv7 Fact identifier
    commandId: string; // Echo of commandId
    projectionStatus: "pending" | "complete"; // Projection update status (asynchronous pipeline)
  }
  ```

---

## 2. Invariants & Error Handling

* **Missing / Invalid Auth**: Throws `unauthenticated` HTTPS error.
* **Schema Violation**: If client data fails schema checks, throws `invalid-argument`.
* **Idempotency Replay**: If the same `commandId` is re-sent, returns the cached result.
* **Constraint Violations**:
  * Detach/replace without a valid `subjectAssociationId` throws `failed-precondition`.
  * Participant validation: If any participant reference does not exist or points to a deleted entity, throws `not-found`.
