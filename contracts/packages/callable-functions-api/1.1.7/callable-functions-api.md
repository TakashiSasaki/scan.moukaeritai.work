# Callable Functions API Contract (v1.1.7)

Metadata: `contractId=callable-functions-api`, `version=1.1.7`, `status=active`, `canonicalJsonVersion=1`, `requestHashVersion=sha256-canonical-json-v1`.

This contract defines the strict Firebase Gen 2 Callable API for backend-only immutable Fact creation in **scan.mw 2.0.18**.

## `submitFactCommand`

- Authentication is required.
- `commandId` is a client-generated UUIDv4 and is not used as proof of idempotency strength.
- Fact IDs are backend-generated UUIDv7 values.
- Request identity is exactly `{ callableApiVersion, factType, data }` serialized with canonical JSON version 1.
- `requestHashVersion` is `sha256-canonical-json-v1` and is persisted in the owner-scoped command receipt.
- Command receipts are scoped at `users/{ownerId}/factCommands/{commandId}` and persist `commandId`, `ownerId`, `factId`, `factType`, `callableApiVersion`, `requestHash`, `requestHashVersion`, and backend execution time.
- Replay comparison fields are `callableApiVersion`, `factType`, `requestHash`, and `requestHashVersion`; a different API version replay for the same owner/commandId is rejected.
- `receivedAt` and `actorUid` may appear in client data only where prior compatible schemas allowed them, but saved Facts overwrite both with backend/authenticated values.
- Backend-only fields (`ownerId`, Fact ID fields, derived index arrays, and `_meta`) are rejected from client requests.
- Object, Marker, and Place participant references are validated for existence and owner scope by the backend transaction for all Fact types.
- The response echoes the request `commandId`, returns the backend Fact ID, and returns `projectionStatus: "pending"` only.

## Fact lifecycle and projection boundary

Facts are backend-only and immutable. Projection ordering, watermarking, processing receipts, retry-safe projection handlers, and conditional summary writes are outside this contract version and remain deferred to scan.mw 2.0.19.
