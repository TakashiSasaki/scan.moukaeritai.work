# Shared EFP Code Packaging Strategy

## Status

Design / prerequisite architecture decision

## Background

The repository has pure projection reconstruction reducers in:
`src/lib/projectionReconstruction.ts`

These reducers are intended to be used by future backend/admin projection generation and reconciliation tooling. However, an attempt to call these reducers from Firebase Functions exposed a deployment boundary problem.

`functions/` is the Firebase Functions source package. Firebase deploy uploads `functions/`. Root `src/lib/...` files are outside that package. Importing `../../src/lib/projectionReconstruction` from `functions/src` compiles or type-checks awkwardly and can produce runtime packaging/load failures.

A Codex review flagged this as a P1 issue: "Keep callable dependencies inside functions bundle."

Therefore, admin projection recompute is blocked until the repository has a clean shared-code strategy.

## Current Blocker

- `src/lib/projectionReconstruction.ts` is currently part of the frontend-root source tree.
- Firebase Functions deployment source is `functions/`.
- Importing root `src` files from `functions/src` can leave deployed functions depending on files outside the uploaded functions package.
- Changing `functions/package.json` main is not a sufficient fix.
- Copying reducers into `functions/src` would duplicate semantics.
- Moving frontend imports to `functions/src` would invert the dependency boundary.

## Non-Goals

The following are explicitly rejected as part of this effort and future work:
- No callable implementation in this design PR.
- No root `src` imports from `functions` (e.g. `../../src/lib/projectionReconstruction`).
- No duplicated reducers in `functions/src` or `functions/src/shared`.
- No symlinks as a shared-code strategy.
- No `package.json` main entrypoint workaround.
- No frontend importing from `functions/src`.
- No read switching.
- No deployment changes.

## Options Considered

### Option A: First-class shared package
Create a first-class shared package, for example `packages/efp-model`, consumed by both the frontend and functions.

### Option B: Build-time copy / generated mirror
Add a build-time copy/generation pipeline that copies canonical shared sources into functions before build/deploy, with generated-file warnings and sync validation.

### Option C: Root-level admin tooling only
Keep projection recompute outside deployed Functions for now and implement it as root-level admin tooling.

### Option D: Formal monorepo/workspace refactor
Refactor the repo into a formal workspace/monorepo layout where shared packages are first-class and Firebase Functions packaging is explicit.

## Recommended Direction

**Option A**, a first-class shared package, is the preferred long-term direction.

Rationale:
- avoids semantic duplication
- avoids frontend depending on functions
- avoids symlink fragility
- avoids deploy-time missing-module failures
- makes shared EFP reducers/types explicitly versioned and testable
- can later be consumed by both Vite frontend and Firebase Functions

*Note: This document only defines the strategy. The implementation of `packages/efp-model` is not part of this PR.*

**Implementation Status:** `packages/efp-model` now contains the canonical pure EFP types/reducers/utilities. Frontend/root code consumes it directly or through compatibility re-export shims. `packages/efp-model` now emits a dist package artifact with JS and declaration files. This makes the shared EFP code packageable.

**Current Status Note:** `@scan/efp-model` emits dual ESM/CommonJS artifacts and has artifact smoke tests. Functions now consume @scan/efp-model only through the packaged dependency path, not through ../../packages/** source imports.

## Required Constraints for Shared EFP Code

A future `packages/efp-model` package must adhere to these constraints:
- must not import frontend Firebase client SDK
- must not import Firebase Admin SDK
- must not import React
- must not access Firestore
- must expose pure TypeScript types and pure functions
- Timestamp should remain structural, based on the `toMillis`-compatible interface
- package must be buildable in both frontend and functions contexts
- generated JS must be included or resolvable in the functions deployment package

## Firebase Functions Packaging Requirements

Any future Functions implementation must satisfy:
- `functions/package.json` main remains compatible with `lib/index.js` unless explicitly redesigned
- deployed functions package must include all runtime dependencies
- functions build must not rely on files outside `functions/` unless they are packaged as proper dependencies
- `verify-functions-deploy-targets.mjs` allowlist must include any new callable before deployment
- no broad `firebase deploy --only functions`

## Follow-up Implementation Sequence

1. Create `packages/efp-model` containing pure shared EFP types and reducers.
2. Move only Firestore-free, runtime-agnostic code into `packages/efp-model`:
   - entityFactProjection types
   - factParticipants helpers
   - projectionReconstruction reducers
   - possibly `stripUndefinedDeep` if it remains Firestore-free
3. Update frontend imports to consume the shared package.
4. Update functions imports to consume the shared package.
5. Ensure frontend build, root tests, functions build, and Firebase deployment packaging all work.
6. Only after that, reintroduce admin projection recompute callable.

Write builders that use frontend-specific `firebase/firestore` imports must not be moved until their SDK dependencies are decoupled or validated.

## PR #132 Handling

PR #132 should not be merged while it imports `../../src/...` from `functions/src`.
It should either be closed, converted to a documentation/blocker PR, or superseded by the shared package strategy.

Any PR that imports root `src/**` from `functions/src` for deployed Functions code must not be merged until the shared packaging strategy is implemented.

## Validation Requirements

This is a documentation-only design PR. Standard validations apply to ensure nothing is broken incidentally:
- `npm run lint`
- `npm run test`
- `npm run test:rules`
- `npm run build`
- `cd functions && npm run build`
