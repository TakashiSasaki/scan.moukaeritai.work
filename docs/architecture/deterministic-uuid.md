# Deterministic UUID Policy

The application uses an application-wide UUIDv5 namespace for generating deterministic UUIDs from canonical JSON payloads.

**Application UUIDv5 Namespace:** `e23891cf-81cd-4231-b750-836376f90efe`

*   **Generated On:** May 23, 2024 (Generated once as UUIDv4)
*   **Purpose:** Application-wide namespace for deterministic UUIDv5 generation from canonical JSON payloads.
*   **Scope:** This is a permanent application-wide policy, not restricted to Phase 6.

## Immutability
This namespace UUID **must not be changed**. Changing this constant will change all derived UUIDv5 IDs across the entire application, breaking database references and deterministic lookups.

## Canonical JSON Requirement
Deterministic UUIDv5 name payloads **must use canonical JSON**.

Ad hoc string concatenation must not be used for UUIDv5 name payloads.

### Canonicalization Rules:
*   Only valid JSON data types (string, number, boolean, null, object, array) are permitted.
*   Unsupported runtime values such as `Date`, `Timestamp`, `undefined`, `Map`, `Set`, functions, and cyclic objects must not be directly included in canonical payloads.
*   Timestamps, if needed, must be explicitly converted to stable strings or numbers before canonicalization.
*   Object keys are sorted deterministically.
*   Array order is preserved and treated as semantically meaningful. If a set-like structure is required, the caller must sort the array before canonicalization.

## Purpose Separation
To avoid ID collisions between different entities that might otherwise serialize identically, purpose separation must be done explicitly inside the canonical JSON payload using fields such as:
*   `app` (e.g., "scan.moukaeritai.work")
*   `idKind` (e.g., "observation", "object")
*   `idPurpose`
*   `schemaVersion`
*   Domain-specific keys

### Example Payload Shape
An example payload to generate a deterministic UUIDv5 (note: actual imported observation implementation is deferred to Phase 6A):

```json
{
  "app": "scan.moukaeritai.work",
  "idKind": "observation",
  "schemaVersion": 1,
  "source": "import",
  "originalRecordId": "abc-123",
  "identifierKey": "qr-scheme-value"
}
```
