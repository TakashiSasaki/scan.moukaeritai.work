# Callable Functions API Contract (v1.1.8)

Metadata: `contractId=callable-functions-api`, `version=1.1.8`, `status=active`, `canonicalJsonVersion=1`, `requestHashVersion=sha256-canonical-json-v1`.

This contract defines the Firebase Gen 2 Callable API for backend-only immutable Fact creation in **scan.mw 2.0.20**.

## `submitFactCommand`

- Authentication is required.
- `commandId` is a client-generated UUIDv4.
- Fact IDs are backend-generated UUIDv7 values.
- Request identity is exactly `{ callableApiVersion, factType, data }` serialized with canonical JSON version `1`.
- `requestHashVersion` is the string `sha256-canonical-json-v1` and is persisted in the owner-scoped command receipt.
- Command receipts are scoped at `users/{ownerId}/factCommands/{commandId}` and persist `commandId`, `ownerId`, `factId`, `factType`, `callableApiVersion`, `canonicalJsonVersion`, `requestHash`, `requestHashVersion`, and `executedAt`.
- Replay comparison fields are `callableApiVersion`, `factType`, `canonicalJsonVersion`, `requestHash`, and `requestHashVersion`.
- A command receipt created under Callable API 1.1.7 and replayed through 1.1.8 is rejected because `callableApiVersion` differs.
- Client-supplied `receivedAt` and `actorUid` are accepted only where schema-compatible, then overwritten by backend/authenticated values before persistence.
- Backend-only fields (`ownerId`, Fact ID fields, derived index arrays, and `_meta`) are rejected from client requests.
- Object, Marker, and Place participant references are validated for existence and owner scope by the backend transaction for all Fact types.
- The response echoes `commandId`, returns the backend Fact ID, and returns `projectionStatus: "pending"` only.

## Projection boundary

Projection ordering, watermarking, processing receipts, retry-safe projection handlers, and conditional summary writes are outside this contract version and remain deferred to scan.mw 2.0.21.
