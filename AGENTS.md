<!--
agent-policy-generated: true
configuration: .agent-policy.yml
DO NOT EDIT DIRECTLY
-->

# Repository agent instructions

These instructions were generated from shared policy profiles and repository-specific policy files.


## Define the change contract before editing

Before editing, identify the requested outcome, the allowed change surface, the existing behavior and invariants that must be preserved, explicit non-goals, and the evidence required for acceptance. Treat unspecified behavior as preserved unless the requested change necessarily alters it; do not silently broaden the contract to resolve ambiguity or implementation difficulty.

_Source: `policy/core/change-contract.md`; rule ID: `changes.define-contract`; severity: `mandatory`._


## Keep changes within the requested scope

Do not modify files, behavior, dependencies, formatting, or architecture that are unrelated to the requested change. Inspect the final diff and remove incidental changes before reporting completion.

_Source: `policy/core/change-scope.md`; rule ID: `changes.minimize-scope`; severity: `mandatory`._


## Do not weaken existing tests

Do not delete, skip, narrow, or relax an existing test merely to make a change pass. For a bug fix, add a regression test that fails before the fix and passes afterward whenever the failure can be reproduced deterministically.

_Source: `policy/core/regression-safety.md`; rule ID: `regression.no-weaken-tests`; severity: `mandatory`._


## Run the repository's required verification

Use the verification command declared by the repository and add focused checks needed for the changed behavior or failure mode. Confirm that the executed checks cover the changed surface and the current revision; a check that is pending, skipped, not triggered, stale, blocked, or merely inspected is not a passing result. Report every required check that was not run or did not pass.

_Source: `policy/core/testing.md`; rule ID: `testing.run-required-checks`; severity: `mandatory`._


## Keep derived artifacts synchronized

When a change affects generated, mirrored, compiled, or otherwise derived artifacts, update them from their declared source of truth using the repository's documented process and verify that no stale or missing output remains. Do not hand-edit generated artifacts unless the repository explicitly designates that operation as authoritative.

_Source: `policy/core/generated-artifacts.md`; rule ID: `consistency.synchronize-derived-artifacts`; severity: `mandatory`._


## Preserve externally observable contracts

Do not break public APIs, serialized data, configuration formats, command-line interfaces, or migration paths unless the requested change explicitly authorizes the incompatibility and documents its consequences.

_Source: `policy/core/compatibility.md`; rule ID: `compatibility.preserve-contracts`; severity: `mandatory`._


## Revalidate destructive actions against current state

Immediately before deleting, overwriting, migrating, deploying, publishing, force-updating, or otherwise making an irreversible or externally visible change, re-read the target's current state and revalidate its identity, scope, version or revision, protections, and conflicting uses. Prefer dry-run, least-scope, and idempotent operations; do not authorize the action solely from stale observations made earlier in the task.

_Source: `policy/core/destructive-actions.md`; rule ID: `safety.revalidate-destructive-actions`; severity: `mandatory`._


## Report actual state and residual uncertainty

Distinguish implemented, generated, executed, verified, and merely inferred results. State unresolved failures and unverified assumptions explicitly.

_Source: `policy/core/truthful-reporting.md`; rule ID: `reporting.truthful-status`; severity: `mandatory`._


## Do not expose or commit secrets

Do not print, persist, or commit credentials, private keys, access tokens, session material, or unredacted sensitive configuration. Use established secret-management mechanisms.

_Source: `policy/security/secrets.md`; rule ID: `security.no-secrets`; severity: `mandatory`._


## Validate data at trust boundaries

Validate untrusted input before it reaches privileged operations, persistence, command execution, or external requests. Preserve existing authentication and authorization checks.

_Source: `policy/security/input-validation.md`; rule ID: `security.validate-boundaries`; severity: `mandatory`._


## Preserve scan.mw repository invariants

Apply the following durable repository-specific rules in addition to the shared policy profiles.

### Canonical sources

Treat these files as the authoritative sources for their respective concerns:

- `contracts/profiles/current-application.json`: active contract profile.
- `contracts/registry.json` and `contracts/packages/`: contract registry and historical packages.
- `src/lib/routeCatalog.ts`: route access policy.
- `docs/architecture/interface-surface-convention.md`: interface-surface vocabulary and namespace convention.
- `.agents/skills/manifest.json`: repository-local skill registry.
- root `package.json`: application version.

Do not reconstruct these facts from duplicated documentation when an authoritative source is available. Treat historical stride records, superseded verification status, and cancelled plans as non-normative context unless a current authoritative source explicitly reactivates them.

### Branch, synchronization, and deployment

`scan.moukaeritai.work` is the integration hub branch. `main` is reserved for Google AI Studio. The named agent source branches are `jules`, `codex`, `hermes`, and `chatgpt`; use only the branch authorized for the current agent or an explicitly authorized isolated test branch.

Pushes to the exact named source branches may be merged automatically into the hub by `.github/workflows/sync-branches.yml`. Do not place incomplete experiments or prepared migration states on an automatically synchronized source branch. Use a separately authorized non-synchronized branch and a pull request when intermediate review is required.

Production deployment is manual through `workflow_dispatch`. Do not perform production writes, deletes, or automatic production deployments. Do not change the source-branch-to-hub synchronization model unless the request explicitly requires it. Do not commit scratch files, one-off scripts, PR replies, downloaded artifacts, or temporary patches to the repository root.

### EFP architecture and access invariants

`scan.mw` is a Firebase-backed inventory application using the Contract-First Entity-Fact-Projection model. Preserve all of the following invariants:

- unauthenticated writes are rejected;
- users cannot access another user's Entities or Facts;
- `ownerId` spoofing is rejected;
- clients do not write Facts directly;
- clients do not write Projections directly;
- Facts are immutable;
- repeating the same `commandId` with the same payload is idempotent;
- reusing the same `commandId` with a different payload is rejected;
- Association attach and detach behavior remains consistent.

Do not weaken authentication, authorization, ownership, immutability, idempotency, or projection boundaries while implementing unrelated changes.

### Interface-surface convention

Use the following vocabulary and preferred namespaces for new or materially modified application interfaces:

- `/`: public surface;
- `/app`: application-use surface;
- `/admin`: administration surface;
- `/dev`: internal-development surface;
- `/api`: external-development and contract surface;
- `/test`: development-verification and test-harness surface.

This is a preferred architectural vocabulary and namespace convention, not an unconditional routing or CLI constraint. Do not perform unrelated broad renames solely for conformance.

### Legacy data and controlled import exception

Legacy data is an archive, not a general migration source. Automatic or comprehensive legacy migration, dual-write, backfill, reconciliation, and runtime integration remain cancelled. Existing legacy Firestore collections must be retained, remain read-only, remain available through the legacy administration browser, and remain exportable as JSON.

The new runtime must not create, update, delete, dual-write, shadow-write, backfill, reconcile, or canary-write legacy collections such as `items`, `identifiers`, and `objectIdentifierBindings`.

The only controlled exception is an administrator-explicit `execute` operation that reads the legacy `identifiers` collection and creates a deterministic imported baseline observation in `identifierObservations`. This exception does not authorize modification or deletion of source documents, automatic or scheduled migration, comprehensive backfill, dual-write, relational reconciliation, or automatic production execution.

### Complexity control

Normal work must not add new mandatory gates, mutation fixtures, contract versions for internal changes, migration phases, broad reconciliation systems, or unrelated foundation abstractions.

Validation, hardening, and verification work must not invent new architectural, routing, naming, access-control, compatibility, or migration constraints. In particular, do not infer path-prefix requirements from surface classification, dynamic-route allowlists, role taxonomies from access values, or closed lists of otherwise valid future routes. Tests for extracted validation or classification logic must import the production implementation instead of duplicating its rules.

Record unrelated findings in the backlog rather than expanding the active task. Complexity-increasing changes require explicit human approval.

### Verification tiers

Select verification according to the change surface:

- `npm run verify:fast`: normal local checks for changed work;
- `npm run verify:pr`: pull-request and CI verification, including security-sensitive and CI-safe integration coverage;
- `npm run verify:release`: release-only full baseline, compatibility, artifact-isolation, documentation-consistency, and version-consistency verification;
- `npm run verify:baseline`: backward-compatible alias for `verify:release`.

Do not require release verification for ordinary changes. Firestore Emulator integration in GitHub Actions remains planned; do not add a local pseudo-emulator as a substitute.

### Version and contract governance

The root `package.json` is the canonical application-version source. Contract versions are independent from the application version. Internal metadata, tests, and documentation-only changes do not require an application-version bump. Version bumps are required for release candidates and externally visible compatibility or API changes. Do not manually duplicate version strings in README files unless unavoidable.

_Source: `policy/project.md`; rule ID: `project.product-invariants`; severity: `mandatory`._


## Follow the current EFP vertical-slice priority

This module records the current product priority rather than a permanent architectural invariant. Update or replace it when the authorized product priority changes.

Complete the first usable EFP-native Object/Marker/Association slice in this order:

1. create an Object;
2. create a Marker;
3. attach the Marker to the Object;
4. read the Marker;
5. display its associated Object;
6. detach the Association;
7. treat the detached Marker as unassigned.

The critical path consists of Object and Marker Entities, Association attach and detach Facts, current Markers for an Object, and the current Object for a Marker. Do not expand Place, Observation, Measurement, Event, projection backfill, generic watermarks, processing receipts, migration phases, or future abstractions unless directly required by this slice.

_Source: `policy/current-priority.md`; rule ID: `project.current-vertical-slice`; severity: `mandatory`._




## Required verification command

```bash
npm run verify:pr
```

