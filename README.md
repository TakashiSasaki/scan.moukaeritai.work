# scan.mw (Version 2.0.20)

[![CI](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/TakashiSasaki/scan.moukaeritai.work/actions/workflows/ci.yml)

Welcome to **scan.mw v2.0.20**, a cloud-based item tracking and inventory management application rebuilt using a modern **Contract-First Baseline** and EFP architecture.

This repository enforces robust schemas, strict version governance, and a registry-first workflow.

## Core Architecture & EFP-Native Paradigm

- **Contract-First Source of Truth**: All schemas and API formats are declared and validated under `/contracts` first.
- **Entity-Fact-Projection (EFP) Model**: Entities are physical identities; Facts are backend-only immutable records; Projections are asynchronous and eventually consistent.

## Fact Runtime Closure Correction and Version Governance Repair (v2.0.20)

Version 2.0.20 is the current correction stride. It repairs the 2.0.18 codex implementation so it can move forward from main 2.0.19 without a version downgrade, aligns Callable API 1.1.8 with runtime request hash constants, and hardens compiled Functions artifact, idempotency, compatibility, regression fixture, stride, and documentation gates.

- **Verification status**: Node-only verification passed locally. Main-target GitHub Actions confirmation is pending.
- **Production Deployment**: Deployments are manual only.
- **Object/Marker Active Workflow**: Not yet fully complete.

### Stride Roadmap & Backlog

- **2.0.18**: Fact Runtime Recovery and Regression Gate Closure (initial codex implementation; version governance, contract/runtime alignment, and test evidence required correction)
- **2.0.19**: Hermes Branch Integration and Branch Workflow Update (main history; not Rules/Legacy/Export closure)
- **2.0.20**: Fact Runtime Closure Correction and Version Governance Repair (Current)
- **2.0.21**: Projection Reliability and Ordering (Deferred)
- **2.0.22**: Rules, Legacy Runtime and Export Closure (Deferred)
- **2.1.0**: EFP-native First Vertical Slice (Deferred)

## Local Development & Validation

```bash
npm ci
npm run verify:baseline
```

## Contract Registry Governance

- `/contracts/registry.json`: registry of contract package versions.
- `/contracts/packages/`: normative JSON schemas and contract descriptions.
- `/contracts/profiles/current-application.json`: active application contract profile.

## Security & Deployment Safety

- Automatic production deployments on push are disabled.
- Firebase Hosting and Functions deploys must be manually triggered.
- Do not perform production write/delete from agent workflows.
