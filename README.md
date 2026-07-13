# scan.mw (Version 2.0.20)

Welcome to **scan.mw v2.0.20**, a cloud-based item tracking and inventory management application using the Contract-First EFP architecture.

## Current stride

**2.0.20 Fact Runtime Closure Correction and Version Governance Repair (Current)** corrects the codex branch Fact runtime recovery work so it can move toward main integration without regressing from main's 2.0.19 application version.

Node-only verification passed locally.
Main-target GitHub Actions confirmation is pending.

## Runtime and contract state

- Application version: **2.0.20**.
- Active Callable Functions API: **1.1.8**.
- Active EFP model: **3.0.0**.
- Request identity is the tuple of `callableApiVersion`, `factType`, and `data`.
- `canonicalJsonVersion` is `1`.
- `requestHashVersion` is the string `sha256-canonical-json-v1` in contract metadata, runtime helpers, and command receipts.
- Command receipts are owner-scoped at `users/{ownerId}/factCommands/{commandId}` and contain `commandId`, `ownerId`, `factId`, `factType`, `callableApiVersion`, `canonicalJsonVersion`, `requestHash`, `requestHashVersion`, and `executedAt`.
- Receipts created by Callable API 1.1.7 are historical. Replaying the same owner and commandId with a 1.1.8 request is rejected because `callableApiVersion` is part of request identity.

## Roadmap and history

- **2.0.17**: Fact Command Integrity Closure Repair (Historical).
- **2.0.18**: Fact runtime recovery initial implementation (Historical). The codex branch implemented major runtime capabilities, but version governance, contract/runtime alignment, and test evidence remained incomplete.
- **2.0.19**: Main branch Hermes integration and branch workflow update (Historical). This is not treated as Rules, Legacy, or Export closure completion.
- **2.0.20**: Fact Runtime Closure Correction and Version Governance Repair (Current).
- **2.0.21**: Projection Reliability and Ordering (Deferred).
- **2.0.22**: Rules, Legacy Runtime and Export Closure (Deferred).
- **2.1.0**: EFP-native First Vertical Slice (Deferred).

## Non-goals in 2.0.20

Projection ordering, projection watermarking, projection processing receipts, broad security rules rewrites, legacy exporter changes, Object/Marker UI workflows, production deploys, and production data writes/deletes are outside this stride.
