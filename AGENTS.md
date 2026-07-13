# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes.

## Agent Instructions (Project-Specific Skills)

This repository uses project-specific agent skills listed in the canonical manifest at `.agents/skills/manifest.json`.
Canonical skill directory: `.agents/skills/`
Before performing a task, check whether a relevant skill exists in the manifest and read its `SKILL.md` before acting.

## 1. Project Overview & v2 Contract-First Paradigm (scan.mw 2.0.20)
**scan.mw** is a cloud-based item tracking and inventory management application.
As of version **2.0.20**, the project follows a **Contract-First Rebuild Baseline**:

1. `/contracts` is the source of truth for schemas, semantics, registries, and active profiles.
2. Entity-Fact-Projection (EFP): Entities are physical identities; Facts are backend-only immutable records; Projections are asynchronous and eventually consistent.
3. SemVer and version integrity are mandatory; major bumps require human approval.
4. Production deployments are manual only (`workflow_dispatch`); no production write/delete.
5. No scratch files or generated temporary patches at repository root.
6. Active skills manifest is `.agents/skills/manifest.json`.

### Active & Completed Backend Work Status

**2.0.18 Fact Runtime Recovery and Regression Gate Closure (initial codex implementation)**:
- Added Functions vendor runtime profile, EFP schema vendoring, derived index arrays, participant validation, UTF-8 SHA-256, UUIDv7, canonical identity tests, logical Fact tests, query/index gate, stride manifest, and documentation reality gate.
- This version remained incomplete for main integration because version governance, contract/runtime alignment, executable evidence, and compiled artifact isolation required correction.

**2.0.19 Hermes Branch Integration and Branch Workflow Update (main history)**:
- Main branch integration and branch workflow updates.
- This is not recorded as Rules/Legacy/Export closure.

**2.0.20 Fact Runtime Closure Correction and Version Governance Repair (Current)**:
- Application version moves forward from main 2.0.19 to 2.0.20; no version downgrade exception is permitted.
- Callable Functions API 1.1.8 is active.
- `requestHashVersion` is the string `sha256-canonical-json-v1` across contract and runtime.
- Functions artifact checks target compiled deployment artifacts.
- Idempotency, Association transition, compatibility, regression fixture, stride, and documentation gates are hardened.
- Node-only verification passed locally. Main-target GitHub Actions confirmation is pending.

**Deferred to 2.0.21 (Projection Reliability and Ordering)**:
- retry-safe projection handler
- duplicate trigger safety
- out-of-order safety
- deterministic Fact order key
- domain-time / Fact-ID watermark
- conditional summary write
- projection processing receipt
- projection status tracking

**Deferred to 2.0.22 (Rules, Legacy Runtime and Export Closure)**:
- strict Entity `_meta` security rules
- Marker identity immutability rule
- restricting Fact reads to `ownerId` scope
- client read denial on legacy collections
- legacy exporter manifest, JSONL, and hash
- cleanup of remaining migration/dual-write scripts

### Stride Roadmap & Backlog
- **2.0.18**: Fact Runtime Recovery and Regression Gate Closure (initial codex implementation requiring correction)
- **2.0.19**: Hermes Branch Integration and Branch Workflow Update (main history; not Rules/Legacy/Export closure)
- **2.0.20**: Fact Runtime Closure Correction and Version Governance Repair (Current)
- **2.0.21**: Projection Reliability and Ordering (Deferred)
- **2.0.22**: Rules, Legacy Runtime and Export Closure (Deferred)
- **2.1.0**: EFP-native First Vertical Slice (Deferred)

## 2. Incomplete Workflows & Legacy UI
- **Object/Marker Workflows**: The new EFP-native Object and Marker creation UI workflows are **incomplete**. Do not claim they are complete.
- **Legacy UI**: All legacy UIs (`/search`, `/overview`, `/unassigned`) and legacy data models (`identifiers`, `objectIdentifierBindings`, `objectEvents`) are **inactive**. Legacy endpoints are safely contained and should not be reconnected to the active EFP routing shell.

## 3. Tech Stack
- **Frontend**: React 19 (Vite), TypeScript, Tailwind CSS.
- **Backend/Database**: Firebase (Firestore, Authentication, Storage, Gen 2 Cloud Functions).

## 4. Design System & UI Architecture
- **Theme**: Material Design 3 (M3) inspired CSS variables.
- **Popups and Menus**: Must close when the user clicks or taps outside (Click Outside Pattern).

## 5. Development Constraints & Routing
- **Port**: Always runs on port **3000**.
- **Admin-Only Routes**:
  - `/admin`
  - `/admin/sitemap`
  - `/developer/*`
  - `/demo`
  - `/library-demo`
  - `/test`
- **Route Access**: The route registry (`src/lib/routeCatalog.ts`) is the single source of truth for route access policy. Pure helpers and `ProtectedRoute`/`AdminRoute` must not duplicate authorization logic but use the registry.

## 6. Firebase Configuration (Database & Storage)
- **EFP Core Collections (Active)**:
  - Entities: `objects`, `markers`, `places`
  - Facts: `associations`, `observations`, `measurements`, `events` (Backend-only, immutable)
  - Projections: `objectSummaries`, `markerSummaries`, `placeSummaries`
- **Cloud Functions**: MUST use Gen 2 (`firebase-functions/v2/https`).

## 7. Branch Workflow
- Agent workflows are restricted strictly to branches `jules`, `codex`, and `hermes`.
