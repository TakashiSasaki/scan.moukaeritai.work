# Developer & AI Agent Guidelines

> **🚨 CRITICAL DIRECTIVE FOR ALL AGENTS 🚨**
> This `AGENTS.md` file acts as the primary memory and source of truth for all architectural, design, and UI decisions in this project. 
> **AGENT BEHAVIOR RULE**: At the end of EVERY task where you make architectural, routing, database, or UI/UX changes, you MUST automatically review and update this file to reflect those changes.

## Agent Instructions (Project-Specific Skills)

This repository uses project-specific agent skills.
Canonical skill directory: `.agents/skills/`
Before performing a task, check whether a relevant skill exists. Read its `SKILL.md` before acting.

## 1. Project Overview & v2 Contract-First Paradigm (scan.mw 2.0.11)
**scan.mw** is a cloud-based item tracking and inventory management application.
As of version **2.0.10**, the project adheres to a **Contract-First Rebuild Baseline**:

1. **Canonical Schema Registry**: The `/contracts` directory is the single source of truth for all schemas, semantics, and registries. No runtime data mutations or API changes can occur without updated contracts. The active contract profile is defined in `contracts/profiles/current-application.json`.
2. **Entity-Fact-Projection (EFP) Model**: 
   - Entities (Object, Marker, Place) are physical identities.
   - Facts (Association, Observation, Measurement, Event) are **backend-only and strictly immutable**.
   - Projections (ObjectSummary, MarkerSummary, PlaceSummary) are **asynchronous and eventually consistent**.
3. **SemVer & Version Integrity**: Version bumps in `package.json` are strictly mandatory whenever sensitive files are modified. **Major bumps require human approval.**
4. **Deployments**: Production deployments are restricted to **manual only** (`workflow_dispatch`). Do not automatically deploy to production or perform production write/delete.
5. **No Scratch Files**: Do not commit scratch files, one-off scripts, PR replies, or generated temporary patches to the root.

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
