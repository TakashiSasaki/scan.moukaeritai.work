# Callable Functions API Contract (v1.1.9)

Metadata: `contractId=callable-functions-api`, `version=1.1.9`, `status=active`, `canonicalJsonVersion=1`, `requestHashVersion=sha256-canonical-json-v1`.

This contract defines the strict Firebase Gen 2 Callable API for backend-only immutable Fact creation in **scan.mw 2.0.21**. It inherits the request and response schema shape of v1.1.8 and repairs machine-checkable closure evidence for request identity, receipt replay, and regression fixtures.

## Request identity and command receipt

- `canonicalJsonVersion` is exactly `1`.
- `requestHashVersion` is exactly `sha256-canonical-json-v1`.
- Command receipts are owner-scoped at `users/{ownerId}/factCommands/{commandId}`.
- The receipt fields are: `commandId`, `ownerId`, `factId`, `factType`, `callableApiVersion`, `canonicalJsonVersion`, `requestHash`, `requestHashVersion`, and `executedAt`.
- Replay comparison fields are: `callableApiVersion`, `factType`, `canonicalJsonVersion`, `requestHash`, and `requestHashVersion`.
- Receipts created by Callable API 1.1.8 or earlier are historical artifacts and MUST NOT be retroactively rewritten.
- A replay for the same owner and commandId using a different Callable API version MUST be rejected.
- A legacy receipt missing version fields such as `callableApiVersion`, `canonicalJsonVersion`, or `requestHashVersion` MUST be rejected rather than silently upgraded.

## Compatibility

v1.1.9 is schema-compatible with the version-specific fixture sets for v1.1.8, v1.1.7, v1.1.6, and v1.1.5. Generic fallback fixtures are not compatibility evidence.
