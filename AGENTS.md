# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes.

## Agent Instructions (Project-Specific Skills)

This repository uses project-specific agent skills listed in the canonical manifest at `.agents/skills/manifest.json`.
Canonical skill directory: `.agents/skills/`
Before performing a task, check whether a relevant skill exists in the manifest and read its `SKILL.md` before acting.

## 1. Project Overview & v2 Contract-First Paradigm (scan.mw 2.0.18)
**scan.mw** is a cloud-based item tracking and inventory management application.
As of version **2.0.18**, the project adheres to a **Contract-First Rebuild Baseline**:

1. **Canonical Schema Registry**: The `/contracts` directory is the single source of truth for all schemas, semantics, and registries. No runtime data mutations or API changes can occur without updated contracts. The active contract profile is defined in `contracts/profiles/current-application.json`.
2. **Entity-Fact-Projection (EFP) Model**: 
   - Entities (Object, Marker, Place) are physical identities.
   - Facts (Association, Observation, Measurement, Event) are **backend-only and strictly immutable**.
   - Projections (ObjectSummary, MarkerSummary, PlaceSummary) are **asynchronous and eventually consistent**.
3. **SemVer & Version Integrity**: Version bumps in `package.json` are strictly mandatory whenever sensitive files are modified. **Major bumps require human approval.**
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
- The 2.0.17 baseline is explicitly treated as repair対象 for artifact completeness, UTF-8 SHA-256 evidence, and all-Fact participant validation until the 2.0.18 gates verify them.

**2.0.18 Fact Runtime Recovery and Regression Gate Closure (Current)**:
- Functions deployment artifact must be self-contained under `functions/vendor`.
- Callable Functions API 1.1.7 is the active API contract.
- Derived Fact index arrays are required, deterministic, deduplicated, and sorted.
- Object/Marker/Place participant existence and ownership validation applies to Association, Observation, Measurement, and Event Facts.
- UTF-8 SHA-256, UUIDv4 command acceptance, UUIDv7 Fact IDs, canonical identity, logical Fact builder, idempotency, Association transition, compatibility, query/index, stride, regression fixture, and documentation reality gates are tracked by `.agents/strides/2.0.18.json`.
- Node-only gates implemented and passing locally (GitHub Actions confirmation unavailable).

**Deferred to 2.0.19 (Projection Reliability and Ordering)**:
- retry-safe projection handler
- duplicate trigger safety
- out-of-order safety
- deterministic Fact order key
- domain-time / Fact-ID watermark
- conditional summary write
- projection processing receipt
- projection status tracking

**Deferred to 2.0.20 (Rules, Legacy Runtime and Export Closure)**:
- strict Entity `_meta` security rules
- Marker identity immutability rule
- restricting Fact reads to `ownerId` scope
- client read denial on legacy collections
- legacy exporter manifest, JSONL, and hash
- cleanup of remaining migration/dual-write scripts

### 📅 Stride Roadmap & Backlog
- **2.0.17**: Fact Command Integrity Closure Repair (修復対象 / partially implemented baseline)
- **2.0.18**: Fact Runtime Recovery and Regression Gate Closure (Current)
- **2.0.19**: Projection Reliability and Ordering (Deferred)
- **2.0.20**: Rules, Legacy Runtime and Export Closure (Deferred)
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
