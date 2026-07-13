# scan.mw (Version 2.0.21)

Welcome to **scan.mw v2.0.21**, a cloud-based item tracking and inventory management application using the Contract-First EFP architecture.

## Current stride

**2.0.21 Regression Harness and Closure Evidence Repair (Current)** repairs closure evidence, fail-closed gates, contract/runtime drift checks, and Node-only behavioral regression harnesses for the Fact runtime work that was implemented through 2.0.20.

## Current contract state

- Application version: **2.0.21**.
- Active Callable Functions API: **1.1.9**.
- `canonicalJsonVersion` is `1`.
- `requestHashVersion` is the string `sha256-canonical-json-v1` in contract metadata, runtime helpers, command receipts, fixtures, and documentation.
- Command receipts are owner-scoped at `users/{ownerId}/factCommands/{commandId}` and contain `commandId`, `ownerId`, `factId`, `factType`, `callableApiVersion`, `canonicalJsonVersion`, `requestHash`, `requestHashVersion`, and `executedAt`.
- Receipts created by Callable API 1.1.8 or earlier are historical. Replaying the same owner and commandId with a 1.1.9 request is rejected because `callableApiVersion` is part of request identity.
- Node-only verification passed locally.
- Main-target GitHub Actions confirmation is pending.

## Stride Roadmap & Backlog

- **2.0.17**: Fact Command Integrity Closure Repair (Historical).
- **2.0.18**: Fact runtime recovery initial implementation (Historical).
- **2.0.19**: Main branch Hermes integration and branch workflow update (Historical).
- **2.0.20**: Fact Runtime Closure Correction and Version Governance Repair (Historical).
- **2.0.21**: Regression Harness and Closure Evidence Repair (Current).
- **2.0.22**: Projection Reliability and Ordering (Deferred).
- **2.0.23**: Rules, Legacy Runtime and Export Closure (Deferred).
- **2.1.0**: EFP-native First Vertical Slice (Deferred).

## Non-goals in 2.0.21

Projection ordering, projection watermarking, projection processing receipts, Firestore Rules closure, Legacy Export closure, Object/Marker UI workflows, QR/NFC workflow work, Java, Firestore Emulator, production deploys, production writes, and production deletes remain out of scope.
