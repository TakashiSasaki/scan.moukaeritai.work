---
id: project.product-invariants
severity: mandatory
overridable: false
order: 1000
---
# Preserve scan.mw repository invariants

Apply the following durable repository-specific rules in addition to the shared policy profiles.

### Canonical sources

Treat these files as the authoritative sources for their respective concerns:

- `contracts/profiles/current-application.json`: active contract profile.
- `contracts/registry.json` and `contracts/packages/`: contract registry and historical packages.
- `src/lib/routeCatalog.ts`: route access policy.
- `docs/architecture/interface-surface-convention.md`: interface-surface vocabulary and namespace convention.
- `.agents/skills/manifest.json`: repository-local skill registry.
- root `package.json`: application version.

Do not reconstruct these facts from duplicated documentation when an authoritative source is available.

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
