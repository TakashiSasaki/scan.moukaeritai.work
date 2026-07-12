# scan.mw (Version 2.0.2)

[![CI](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml)

Welcome to **scan.mw v2.0.2**, a cloud-based item tracking and inventory management application redesigned and rebuilt using a modern **Contract-First Baseline** and fully aligned EFP architecture.

This repository enforces backward-incompatible, robust schemas, strict version governance, and a registry-first workflow.

---

## 🏗️ Core Architecture & EFP-Native Paradigm

- **Contract-First Source of Truth**: All data models, schemas, and API formats are declared and validated within the `/contracts` directory first.
- **Entity-Fact-Projection (EFP) Model**: 
  - **Entities** (Timeless identity, e.g., Objects, Markers, Places)
  - **Facts** (Temporal records of events/observations, e.g., Associations, Observations, Measurements, Events)
  - **Projections** (Derived, eventually-consistent caches optimized for user-facing reads, e.g., ObjectSummaries, MarkerSummaries, PlaceSummaries)
- **Zero Backwards-Compatibility Bloat**: v2.0.2 represents a clean break from old v1 patterns. Legacy migration schemas are stored for read-only historical lookup, and live transactions strictly adhere to EFP JSON contracts.

---

## 🚀 EFP-Native Backend Fact Pipeline (v2.0.2 Milestone)

This milestone introduces the robust, server-secure EFP Fact Command Pipeline:
- **Strict Backend-Only Fact Creation**: Direct client-side writes to Firestore Fact collections (`associations`, `observations`, `measurements`, `events`) are strictly blocked by Firestore Security Rules. All Facts are created append-only via the `submitFactCommand` Cloud Callable Function.
- **Validation & Constraint Hardening**: The command endpoint validates payloads against registered JSON Schema v3.0.0 contracts, injects standard system attributes (`id`, `ownerId`, `_meta`), maps temporal/spatial fields (e.g. converting ISO strings to Native Timestamps/GeoPoints), and stores atomic command receipts to enforce Idempotency.
- **In-Band Projection Reconciliation**: On successful Fact append, the backend triggers in-band projection summary recomputations for all referenced Entities. This delivers instant, read-after-write consistency to the client.

---

## 🛠️ Local Development & Validation

To ensure extreme contract and baseline reliability, use the following commands:

```bash
# Install dependencies
npm ci

# Start the local development server (Port 3000)
npm run dev

# Run Contract Registry & JSON Schema validations
npm run contracts:validate

# Verify Semantic Version (SemVer) bump compliance (used on PRs/Strides)
npm run version:verify

# Run TypeScript linting
npm run lint

# Build the application
npm run build
```

---

## 📜 Contract Registry Governance

The canonical definition of application state and data structures is managed under:
* `/contracts/registry.json`: Registry list of active contract versions.
* `/contracts/packages/`: Raw JSON schemas and contract descriptions (e.g., `efp-model/2.0.0`).
* `/contracts/profiles/current-application.json`: Profile specifying which contract package versions the current UI deployment actively supports.

### Schema Validation
Any changes to `/contracts` can be dynamically verified locally using:
```bash
npm run contracts:validate
```
This tool uses `ajv` to compile all referenced JSON schemas and verify that the application profile perfectly aligns with registered versions.

---

## 🔒 Security & Deployment Safety

- **No Push Deployments**: Automatic deployments on code push are completely disabled.
- **Workflow Dispatch Only**: Deployments to Firebase Hosting and Firebase Functions must be triggered manually via `workflow_dispatch` through GitHub Actions.
- **Read-Only Legacy Export Tool**: To back up v1 data without risking production mutations, use the locked read-only tool:
  ```bash
  npm run ops:export-legacy
  ```
  *(Note: Requires valid Google Application Default Credentials or FIREBASE_CONFIG env vars to run live; otherwise performs a graceful verification dry-run).*
