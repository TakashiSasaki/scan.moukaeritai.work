# scan.mw (Version 2.0.14)

[![CI](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml)

Welcome to **scan.mw v2.0.14**, a cloud-based item tracking and inventory management application rebuilt using a modern **Contract-First Baseline** and EFP architecture.

This repository enforces backward-incompatible, robust schemas, strict version governance, and a registry-first workflow.

---

## 🏗️ Core Architecture & EFP-Native Paradigm

- **Contract-First Source of Truth**: All data models, schemas, and API formats are declared and validated within the `/contracts` directory first.
- **Entity-Fact-Projection (EFP) Model**: 
  - **Entities** (Timeless identity, e.g., Objects, Markers, Places)
  - **Facts** (Temporal records of events/observations, e.g., Associations, Observations, Measurements, Events) - **Backend-only and immutable**.
  - **Projections** (Derived caches optimized for user-facing reads) - **Asynchronous and eventually-consistent**.

---

## 🚀 Node-Only Verification Closure and Skill Consistency (v2.0.14)

Version 2.0.14 focuses on establishing a completely unified, Node-only verification baseline and removing Java dependencies and Firebase emulators from the active validation paths.

- **Node-only Rules Static Policy Gate**: Firestore Security Rules are audited using a lightweight Node.js static policy verification script rather than a heavy Firestore Emulator behavior test suite.
  - *Disclaimer*: Rules validation uses static policy analysis checking rules syntax, default denials, and block configurations. Behavior-level emulator execution is not conducted, and static verification is not represented as runtime behavioral test verification.
- **Fail-Closed Preflight and Closeout Gates**: Solidified preflight checks and closeout gates to prevent working-tree leakage, dirty deployments, or invalid contract registry modifications.
- **Transactional Fact and Projection Safety**: Deferred to **2.0.15** (including exact factType request hash verification, canonical JSON standard, typed participantKeys, array sort/deduplication, transactional Association subject, UUIDv7, and projection status tracking).
- **Rules / Legacy Closure**: Deferred to **2.0.16** (including strict Entity `_meta` rules, Marker identity immutability, denying legacy reads).
- **Object/Marker Active Workflow**: Not yet fully complete.
- **Production Deployment**: Deployments are strictly **manual only**.
- **Major Version Bumps**: Require explicit human approval.

### 📅 Stride Roadmap & Backlog
- **2.0.14**: Node-Only Verification Closure and Skill Consistency (Current)
- **2.0.15**: Transactional Fact and Projection Safety Closure (Deferred)
- **2.0.16**: Rules, Legacy Runtime and Export Closure (Deferred)
- **2.1.0**: EFP-native First Vertical Slice (Deferred)

---

## 🛠️ Local Development & Validation

To ensure extreme contract and baseline reliability, use the single entry point command:

```bash
# Install dependencies
npm ci

# Run the fail-closed verification pipeline
# Node-only gates implemented and passing locally (GitHub Actions confirmation unavailable)
npm run verify:baseline
```

---

## 📜 Contract Registry Governance

The canonical definition of application state and data structures is managed under:

* `/contracts/registry.json`: Registry list of active contract versions.
* `/contracts/packages/`: Raw JSON schemas and contract descriptions.
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
 
