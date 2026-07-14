# Developer & AI Agent Guidelines (scan.mw 2.1.0)

This file records only active operating rules for this repository. Historical stride details and cancelled migration plans must not be treated as current work.

## Canonical sources

- Active contract profile: `contracts/profiles/current-application.json`
- Contract registry and historical packages: `contracts/registry.json` and `contracts/packages/`
- Route access policy: `src/lib/routeCatalog.ts`
- Interface surface convention: `docs/architecture/interface-surface-convention.md`
- Agent skill manifest: `.agents/skills/manifest.json`
- Application version: root `package.json`

## Branch and deployment rules

- Agent workflows are restricted to `jules`, `codex`, and `hermes` unless a higher-priority instruction explicitly provides another branch.
- Production deploys are manual only (`workflow_dispatch`). Do not perform production writes, deletes, or automatic production deploys.
- `main` remains administrator-controlled; do not change the main-to-agent-branch synchronization model.
- Do not commit scratch files, one-off scripts, PR replies, or generated temporary patches to the repository root.

## Active architecture

`scan.mw` is a Firebase-backed inventory application using the Contract-First Entity-Fact-Projection (EFP) model.

Active EFP invariants:

- Reject writes by unauthenticated users.
- Prevent access to other users' Entities and Facts.
- Prevent `ownerId` spoofing.
- Prohibit client direct writes to Facts.
- Prohibit client direct writes to Projections.
- Preserve Fact immutability.
- Preserve idempotency for the same `commandId` and payload.
- Reject the same `commandId` with a different payload.
- Preserve basic Association attach/detach consistency.

## Interface surface convention

Application interfaces should gradually align with the vocabulary and preferred namespaces defined in `docs/architecture/interface-surface-convention.md`:

- `/` — public surface
- `/app` — application-use surface
- `/admin` — administration surface
- `/dev` — internal-development surface
- `/api` — external-development and contract surface
- `/test` — development-verification and test-harness surface

This is a preferred architectural vocabulary and namespace convention, not an absolute routing or CLI constraint. Prefer it for new interfaces and align existing interfaces when they are already being materially modified. Do not perform unrelated broad renames solely for conformance.

## Legacy data policy and Controlled Import Exception

Legacy data is an archive, not a migration source.

- Legacy migration: Cancelled (no automatic or comprehensive migration is performed).
- Legacy dual-write: Cancelled.
- Legacy backfill: Cancelled.
- Legacy reconciliation: Cancelled.
- Legacy runtime integration: Cancelled.
- Legacy Firestore retention: Required.
- Legacy read-only access: Required.
- Legacy admin browser: Required.
- Legacy JSON export: Required.
- Legacy write prohibition: Required.

The new runtime must not create, update, delete, dual-write, shadow-write, backfill, reconcile, or canary-write legacy collections. Existing legacy collections (e.g., `items`, `identifiers`, `objectIdentifierBindings`) remain in Firestore as read-only records.

### Controlled Imported Observation Exception

As a limited and formal exception:
- **Controlled imported observation execution**: Only when an administrator explicitly demands execution (`execute` mode), the legacy `identifiers` collection is referenced as a read source to create a deterministic imported baseline observation in the `identifierObservations` collection.
- This exception **does not** imply:
  - Any updates or deletions of legacy source documents.
  - Automatic, background, or scheduled migration.
  - Dual-write or backfill of all records.
  - Relational reconciliation frameworks or automatic production execution.

## Complexity control

Shared simplification rules live in `.agents/policies/complexity-control.md`. Do not add new gates, mutation fixtures, contract versions, or unrelated foundation work for normal internal tasks.

## Current vertical slice priority

The next product priority is the first usable EFP-native Object/Marker/Association slice:

1. Create Object.
2. Create Marker.
3. Attach Marker to Object.
4. Read Marker.
5. Display the associated Object.
6. Detach Association.
7. Treat the detached Marker as unassigned.

Critical-path scope:

- Entity: Object and Marker.
- Fact: Association attach and detach.
- Read model: current Markers for an Object and current Object for a Marker.

Do not expand Place, Observation, Measurement, Event, projection backfill, generic watermarks, processing receipts, migration phases, or future abstractions unless they are directly required for this slice.

## Verification tiers

- `npm run verify:fast`: daily local checks for changed work.
- `npm run verify:pr`: PR/CI checks, including security-sensitive and integration coverage that is safe for CI.
- `npm run verify:release`: release-only full baseline, compatibility, artifact isolation, full documentation consistency, and version consistency.
- `npm run verify:baseline`: backward-compatible alias for `verify:release`.

Firestore Emulator integration tests are planned for GitHub Actions. Current PR verification uses Node-based static policy checks only; do not add a local pseudo-emulator.

## Version and contract governance

- Root `package.json` is the canonical application version source.
- Contract versions are independent from the application version.
- Internal metadata, tests, and documentation-only changes do not require a version bump.
- Version bumps are required for release candidates or externally visible compatibility/API changes.
- Do not manually duplicate version strings in README unless unavoidable.

## Verification Status

- Node-only gates implemented and passing locally.
- GitHub Actions confirmation unavailable.
