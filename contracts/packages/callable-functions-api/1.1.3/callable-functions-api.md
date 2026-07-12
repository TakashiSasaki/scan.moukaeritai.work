# Callable Functions API Contract (v1.1.3)

This contract defines the strict API specification for the backend-only immutable Fact creation pipeline in **scan.mw**.

## 1. API Endpoints

All endpoints are implemented as Firebase Gen 2 HTTPS Callable Functions.

### 1.1 `submitFactCommand`

Creates an immutable Fact (Association, Observation, Measurement, or Event) on behalf of the authenticated user.

* **Authentication**: Required. The caller must be a registered, authenticated user.
* **Idempotency**: Strict idempotency is not yet fully implemented, but basic idempotency check by commandId is partially supported.

* **Request Payload Schema**:
  The request must be a discriminated union based on `factType`.

  ```typescript
  type SubmitFactCommandRequest = 
    | AssociationSubmitRequest
    | ObservationSubmitRequest
    | MeasurementSubmitRequest
    | EventSubmitRequest;

  interface BaseSubmitRequest {
    commandId: string; // Client-provided unique request identifier (strictly UUIDv4 format)
  }

  interface AssociationSubmitRequest extends BaseSubmitRequest {
    factType: "association";
    data: AssociationClientData;
  }

  interface ObservationSubmitRequest extends BaseSubmitRequest {
    factType: "observation";
    data: ObservationClientData;
  }

  interface MeasurementSubmitRequest extends BaseSubmitRequest {
    factType: "measurement";
    data: MeasurementClientData;
  }

  interface EventSubmitRequest extends BaseSubmitRequest {
    factType: "event";
    data: EventClientData;
  }
  ```

* **Client-Specified Fields vs Backend-Authoritative Fields**:
  Client provides specific fields, while the backend injects ID, ownerId, indexing arrays, and _meta.
  *Note: `time.receivedAt` and `provenance.actorUid` are currently provided by the client (or default injected) but will transition to strictly backend-authoritative fields in the next stride (v2.0.11). The current runtime behavior continues to accept them from the client to avoid mismatch.*

  * For `"association"`:
    ```typescript
    interface AssociationClientData {
      operation: "attach" | "detach" | "replace";
      participants: Array<{ role: string; ref: { entityType: string; id: string } }>;
      effectiveAt: string; // RFC 3339 string
      subjectAssociationId?: string | null;
      note?: string;
      provenance?: any; // To be strictly backend-authoritative in the future
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
    projectionStatus: "pending" | "complete"; 
  }
  ```
  *Note: The current `submitFactCommand` runtime will always return `"pending"` for `projectionStatus` since projections are updated asynchronously via Firestore triggers. The `"complete"` value is a reserved future state and is not currently returned.*

---
## 2. Invariants & Error Handling

* **Missing / Invalid Auth**: Throws `unauthenticated` HTTPS error.
* **Schema Violation**: If client data fails schema checks, throws `invalid-argument`.
* **Idempotency Replay**: If the same `commandId` is re-sent, returns the cached result.
* **Constraint Violations**:
  * Detach/replace without a valid `subjectAssociationId` throws `failed-precondition`.
  * Participant validation: If any participant reference does not exist or points to a deleted entity, throws `not-found`.
