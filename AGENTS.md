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

**Completed in 2.0.11/2.0.12/2.0.13**:
- owner-scoped command receipt
- transaction-nested receipt read
- initial request hash calculation
- backend-generated `receivedAt` timestamp
- backend-enforced `actorUid` matching authenticated user
- initial duplicate query within transactions
- Verification Enforcement and Skill Execution Closure (manifest schema verification, skill command integrity checks, and fail-closed version verifier)

**Completed in 2.0.14 (Node-Only Verification Closure and Skill Consistency)**:
- Removing Java runtime setups, setup-java, and Firebase Firestore emulators from active verification pipeline, local scripts, and skills.
- Node-only static policy validation for Firestore Security Rules (`test:firestore-policy`).
  - *Disclaimer*: Firestore Security Rules are checked via Node-only static policy analysis (verifying syntactic structures, global deny existence, and write locks). Behavioral tests using the Emulator are not conducted, and static verification is not represented as runtime behavior validated.
- Solidified fail-closed preflight validation and closeout procedures.
- Standardized EFu catalog output directory to `.local-data/generated/index.efu.csv` with Hygiene Gate integration.
- Standardized `npx` execution syntax checking under the skill integrity validation.
- Node-only gates implemented and passing locally (GitHub Actions confirmation unavailable).

**Completed in 2.0.15 (Transactional Fact and Projection Safety Closure)**:
- request hash verification with exact `factType` & schema version
- rejecting same `commandId` with different `factType` inside transaction
- typed `participantKeys` usage in functions (via `buildFactIndexFields`)
- sorting/deduplication of all index arrays (via `buildFactIndexFields`)
- Transactional Association subject reading inside Firestore transactions
- validation matching detach participants with subject (identical participantKeys)
- checking Object/Marker replace consistency (must share at least one participant key)
- checking old vs new Marker schema integrity (comparing identityModelVersion and canonicalizationVersion)
- throwing errors in projection updates instead of swallowing them

**Completed in 2.0.16 (Partial Fact Command Integrity)**:
- Reverted commandId UUID validation from strict UUIDv7 to UUIDv4 across all API contracts, schemas, and fixtures.
- Created and registered Callable Functions API Contract version 1.1.5.
- Fixed 1.1.4 API backward-compatibility issues regarding client-submitted UUIDv4 commandIds.

**Completed in 2.0.17 (Fact Command Integrity Closure Repair)**:
- Fixed request hash to use active Callable API version (instead of schemaVersion 3).
- command receipt saves callableApiVersion and requestHashVersion.
- canonical serialization as a pure helper.
- pure logical Fact builder and pre-save EFP schema validation.
- Standard UUIDv7 Fact ID using `uuid` package.
- Standard UTF-8 SHA-256 for Marker keys.
- Participant Entity read inside transaction.
- Strict Association replace check.
- `ownerId` + `subjectAssociationId` composite index.
- Query/index integrity gate added.
- Authority boundary and idempotency tests added.

**Deferred to 2.0.18 (Projection Reliability and Ordering)**:
- projection receipt status updates
- duplicate/out-of-order event safety
- domain-time/fact-ID watermark

**Deferred to 2.0.19 (Rules, Legacy Runtime and Export Closure)**:
- canonical JSON serialization standard
- rigorous logical Fact validation matching schemas
- `ownerId` + `subjectAssociationId` composite index
- standardized UUIDv7 generation
- standardized UTF-8 SHA-256
- strict Entity `_meta` security rules
- Marker identity immutability rule
- restricting Fact reads to `ownerId` scope
- client read denial on legacy collections
- legacy exporter manifest, JSONL, and hash
- cleanup of remaining migration/dual-write scripts
- closure of Draft PR #1 (never merge without human authorization)

### 📅 Stride Roadmap & Backlog
- **2.0.15**: Transactional Fact and Projection Safety Closure (Completed)
- **2.0.16**: Partial Fact Command Integrity (Completed)
- **2.0.17**: Fact Command Integrity Closure Repair (修復対象)
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
- Agent workflows are restricted strictly to branches `jules` and `codex`.
