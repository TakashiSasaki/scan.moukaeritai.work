# CI/CD Workflows and Deployment Architecture

This document outlines the deployment architecture and the GitHub Actions workflows used in this repository. It serves as a reference for developers and AI coding agents to understand how code is validated, deployed, and how branches are synchronized.

## Deployment Architecture

The application follows a serverless, decoupled architecture utilizing the Firebase ecosystem.

- **Frontend (Client-Side)**: 
  - **Tech Stack**: React 19 (Vite), TypeScript, Tailwind CSS.
  - **Hosting Target**: **Firebase Hosting** (`scan-moukaeritai-work`).
  - **Reasoning**: Firebase Hosting provides fast CDN-backed delivery for the Single Page Application (SPA) and integrates seamlessly with Firebase Authentication and Firestore.

- **Backend (Server-Side)**: 
  - **Tech Stack**: Node.js, Firebase Cloud Functions (Gen 2).
  - **Hosting Target**: **Firebase Cloud Functions** (located in `/functions`).
  - **Purpose**: Handles operations that require elevated privileges or secret management, such as hiding the Gemini API key for AI processing, performing secure administrative metrics fetching (e.g., Cloud Storage bucket sizes), and backend data validation.

- **Data & Storage**:
  - **Database**: Cloud Firestore.
  - **Blob Storage**: Cloud Storage for Firebase.

## GitHub Actions Workflows

All CI/CD and automation pipelines are managed via GitHub Actions located in `.github/workflows/`. The `main` branch acts as the absolute source of truth for the codebase.

### 1. Core CI/CD (Validation & Deployment)
- **`ci.yml`**: 
  - **Trigger**: `push` and `pull_request` to `main`, plus `workflow_dispatch`.
  - **Purpose**: Runs automated checks (linting, type checking, and building) for both the frontend (`/src`) and backend (`/functions`). It ensures code quality but does not perform any deployments.
- **`deploy-hosting.yml`**: 
  - **Trigger**: `push` to `main` (filtered by changes in `/src`, `/public`, etc.).
  - **Purpose**: Builds the Vite React app and deploys it to Firebase Hosting.
- **`deploy-functions.yml`**: 
  - **Trigger**: `push` to `main` (filtered by changes in `/functions`).
  - **Purpose**: Builds and deploys the backend Node.js code to Firebase Cloud Functions. Note: Deployments use explicit function targeting (`--only functions:funcA,functions:funcB`) to avoid interactive deletion prompts for legacy functions.

### 2. Branch Synchronization
- **`sync-agent-branches.yml`**: 
  - **Purpose**: Automatically synchronizes AI agent branches (`jules`, `codex`) with `main`. 
  - **Conflict Resolution**: If conflicts occur, `main` is treated as the canonical source of truth and its changes are forcefully merged (`git merge main -X theirs`).
- **`sync-branch.yml`**: 
  - **Purpose**: Syncs changes from an upstream repository specific to the `scan.moukaeritai.work` branch structure.

### 3. Data Migration and Operational Workflows (Pending Review)
These workflows were created for specific data migration phases (Entity-Fact-Projection model) and legacy data audits. They are retained for operational safety and backfilling, though they may be phased out in the future:
- **`phase-7d-imported-observation-dry-run.yml`**: Dry-run operations for observation data migration.
- **`phase-7d1-legacy-items-field-audit.yml`**: Audit tasks for legacy item data structures.
- **`projection-backfill-design-gate.yml`**: Controls the design gating and backfill execution for database projections.

---
**Note for AI Agents**: When proposing architectural changes, adding new Cloud Functions, or changing deployment targets, ensure these workflows (and `.github/workflows/deploy-functions.yml` in particular) are updated accordingly.
