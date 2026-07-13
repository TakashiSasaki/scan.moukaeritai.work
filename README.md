# scan.mw (Version 2.0.22)

Welcome to **scan.mw v2.0.22**, a cloud-based item tracking and inventory management application using the Contract-First EFP architecture.

## Current stride

**2.0.22 Behavioral Harness Closure and Merge Readiness (Current)** closes the behavioral Node-only regression harness work for the Fact command runtime without expanding Projection, Rules, Legacy Export, Object UI, Marker UI, QR, or NFC scope.

- Application version: **2.0.22**.
- Callable Functions API: **1.1.9** is maintained.
- Contract/runtime metadata continue to use `canonicalJsonVersion=1` and `requestHashVersion=sha256-canonical-json-v1`.
- Node-only verification passed locally.
- Main-target GitHub Actions confirmation is pending.

## Roadmap

- **2.0.21**: Regression Harness and Closure Evidence Repair (Historical; initial evidence model was improved, but behavioral harness remained incomplete).
- **2.0.22**: Behavioral Harness Closure and Merge Readiness (Current).
- **2.0.23**: Projection Reliability and Ordering (Deferred).
- **2.0.24**: Rules, Legacy Runtime and Export Closure (Deferred).
- **2.1.0**: EFP-native First Vertical Slice (Deferred).

## Non-goals in 2.0.22

Projection ordering, Projection watermarking, Projection processing receipts, Firestore Rules closure, Legacy Export, Object/Marker UI, QR/NFC workflow, Java, Firestore Emulator, production deploys, production writes, and production deletes are outside this stride.
