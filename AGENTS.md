# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes.

## Agent Instructions (Project-Specific Skills)

This repository uses project-specific agent skills listed in the canonical manifest at `.agents/skills/manifest.json`.
Canonical skill directory: `.agents/skills/`
Before performing a task, check whether a relevant skill exists in the manifest and read its `SKILL.md` before acting.

## 1. Project Overview & v2 Contract-First Paradigm (scan.mw 2.0.21)
**scan.mw** is a cloud-based item tracking and inventory management application. As of version **2.0.21**, the project remains on the **Contract-First EFP architecture**:

1. **Canonical Schema Registry**: The `/contracts` directory is the single source of truth for all schemas, semantics, and registries. No runtime data mutations or API changes can occur without updated contracts. The active contract profile is defined in `contracts/profiles/current-application.json`.
2. **Entity-Fact-Projection (EFP) Model**: Entities (Object, Marker, Place) are physical identities; Facts (Association, Observation, Measurement, Event) are backend-only and strictly immutable; Projections are asynchronous and eventually consistent.
3. **SemVer & Version Integrity**: Version bumps in `package.json` are strictly mandatory whenever sensitive files are modified. **Major bumps require human approval.** Version downgrade exceptions are forbidden.
4. **Deployments**: Production deployments are restricted to **manual only** (`workflow_dispatch`). Do not automatically deploy to production or perform production write/delete.
5. **No Scratch Files**: Do not commit scratch files, one-off scripts, PR replies, or generated temporary patches to the root.
6. **Active Skills Manifest**: Canonical manifest is `.agents/skills/manifest.json`. Active core skills must be executed strictly following preflight, hygiene, and closeout protocols.

### 📋 Active & Completed Backend Work Status

**Completed through 2.0.16**:
- Node-only verification closure and skill consistency.
- Transactional Fact and Projection Safety Closure.
- Partial Fact Command Integrity with client-generated UUIDv4 `commandId` compatibility.

**2.0.17 Fact Command Integrity Closure Repair (修復対象 / partially implemented baseline)**:
- Introduced active Callable API based request identity and receipt fields.
- Introduced logical Fact builder and UUIDv7 Fact ID generation.
- Introduced query/index integrity checks.

**2.0.18 Fact runtime recovery initial implementation**:
- The codex branch implemented major Fact runtime capabilities, including Functions vendor runtime profile, EFP schema vendoring, derived index arrays, participant validation, UUIDv7 Fact IDs, and query/index gates.
- Version governance, contract/runtime alignment, and test evidence remained incomplete and required 2.0.20 correction.

**2.0.19 Main branch Hermes integration and branch workflow update**:
- Main branch integrated Hermes branch workflow updates.
- This version must not be described as completing Rules, Legacy Runtime, or Export closure.

**2.0.20 Fact Runtime Closure Correction and Version Governance Repair (Historical)**:
- Callable Functions API 1.1.8 was the active API contract for 2.0.20.
- Functions artifact preparation resolves versions from `contracts/profiles/current-application.json` and fails closed when contract metadata is missing or inactive.

**2.0.21 Regression Harness and Closure Evidence Repair (Current)**:
- Callable Functions API 1.1.9 is the active API contract.
- `canonicalJsonVersion` is `1` and `requestHashVersion` is `sha256-canonical-json-v1` across contract metadata, runtime helpers, command receipts, fixtures, and documentation.
- Stride evidence now requires typed source/test/contract/fixture/gate/documentation/workflow evidence, existing package scripts, and fail-closed documentation/runtime distinction.
- Node-only verification passed locally.
- Main-target GitHub Actions confirmation is pending.

**Deferred to 2.0.22 (Projection Reliability and Ordering)**:
- retry-safe projection handler
- duplicate trigger safety
- out-of-order safety
- deterministic Fact order key
- domain-time / Fact-ID watermark
- conditional summary write
- projection processing receipt
- projection status tracking

**Deferred to 2.0.23 (Rules, Legacy Runtime and Export Closure)**:
- strict Entity `_meta` security rules
- Marker identity immutability rule
- restricting Fact reads to `ownerId` scope
- client read denial on legacy collections
- legacy exporter manifest, JSONL, and hash
- cleanup of remaining migration/dual-write scripts

### 📅 Stride Roadmap & Backlog
- **2.0.17**: Fact Command Integrity Closure Repair (Historical)
- **2.0.18**: Fact runtime recovery initial implementation (Historical)
- **2.0.19**: Main branch Hermes integration and branch workflow update (Historical)
- **2.0.20**: Fact Runtime Closure Correction and Version Governance Repair (Historical)
- **2.0.21**: Regression Harness and Closure Evidence Repair (Current)
- **2.0.22**: Projection Reliability and Ordering (Deferred)
- **2.0.23**: Rules, Legacy Runtime and Export Closure (Deferred)
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
