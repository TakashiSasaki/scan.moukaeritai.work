# Deterministic UUID Policy

The application uses an application-wide UUIDv5 namespace for generating deterministic UUIDs from canonical JSON payloads.

**Application UUIDv5 Namespace:** `e23891cf-81cd-4231-b750-836376f90efe`

*   **Recorded On:** May 23, 2026
*   **Generation:** Generated once as UUIDv4 during Phase 6-prep.
*   **Purpose:** Application-wide namespace for deterministic UUIDv5 generation from canonical JSON payloads.
*   **Scope:** This is a permanent application-wide policy, not restricted to Phase 6.

## Immutability
This namespace UUID **must not be changed**. Changing this constant will change all derived UUIDv5 IDs across the entire application, breaking database references and deterministic lookups.

## Canonical JSON Requirement

Deterministic UUIDv5 name payloads **must use canonical JSON**.

JCS refers to JSON Canonicalization Scheme as specified by RFC 8785. For this project, deterministic UUIDv5 payloads must be serialized as JCS-canonical UTF-8 JSON before being used as the UUIDv5 name input.

Ad hoc string concatenation must not be used for UUIDv5 name payloads.

### Canonicalization Rules:
*   Only valid JSON data types (string, number, boolean, null, object, array) are permitted.
*   Unsupported runtime values such as `Date`, `Timestamp`, `undefined`, `Map`, `Set`, functions, and cyclic objects must not be directly included in canonical payloads.
*   Timestamps and runtime-specific values, if needed, must be explicitly converted to stable JSON primitives before canonicalization.
*   Object keys are sorted deterministically according to JCS.
*   Array order is preserved and treated as semantically meaningful. If a set-like structure is required, the caller must explicitly sort the array before JCS canonicalization.
*   The output representation must be UTF-8.

## Identifier Semantic Identity Payload

For identifiers, semantic identity is represented by a structured JCS payload.

**Required conceptual shape:**
```json
{
  "app": "scan.moukaeritai.work",
  "idKind": "identifier",
  "identitySchemaVersion": 1,
  "canonicalizationVersion": 1,
  "kind": "<qr|nfc|manual|barcode|bluetooth>",
  "scheme": "<scheme-name>",
  "canonicalValue": "<canonicalized-identifier-value>"
}
```

The payload **must include**:
*   `app`
*   `idKind`
*   `identitySchemaVersion`
*   `canonicalizationVersion`
*   `kind`
*   `scheme`
*   `canonicalValue`

The payload **must not include**:
*   `ownerId`
*   `objectId`
*   `legacyItemId`
*   `observerUid`
*   binding target
*   `label`
*   `idPurpose` (optional general-purpose separator; canonical identifier payloads do not use it)
*   `identityModelVersion`
*   `rawPayload`
*   `rawValue`
*   `status`
*   timestamps
*   location
*   RSSI
*   visibility
*   migration provenance

### Derivation

The `identifierKey` is a deterministic storage-safe projection of this semantic identity.
`identifierKey = UUIDv5(applicationNamespaceUuid, JCS(identifierSemanticIdentityPayload))`

`identifiers/{identifierKey}` uses this UUID as the Firestore document ID. The `IdentifierRecord.identifierKey` must equal the document ID.

Note: The semantic identity is not the raw identifier value itself. In future v2 design, optional `rawPayload` may preserve original source payloads, but `rawPayload` is non-identifying and excluded from UUIDv5 derivation. Current runtime `rawValue` (if present) is also excluded from identity derivation.


### Version field separation

* `identitySchemaVersion`: UUIDv5/JCS payload structure version; included in the canonical payload.
* `canonicalizationVersion`: canonicalization rule version; included in the canonical payload.
* `identityModelVersion`: runtime interpretation version of `IdentifierRecord`; stored on records and **not** included in UUIDv5 payload.

For canonical identifier payloads, `idKind = "identifier"` is sufficient purpose separation. `idPurpose` remains a general-purpose concept for other deterministic UUID domains, but canonical identifier payloads intentionally omit it.

## Purpose Separation
To avoid ID collisions between different entities that might otherwise serialize identically, purpose separation must be done explicitly inside the canonical JSON payload using fields such as:
*   `app` (e.g., "scan.moukaeritai.work")
*   `idKind` (e.g., "observation", "object")
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
