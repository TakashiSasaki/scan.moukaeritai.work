# Firebase Functions Deployment Safety

## Context

The Firebase project (`moukaeritaid`) is shared with other applications. As a result, this repository must strictly control which Firebase Functions it deploys, modifies, or deletes to avoid interfering with functions owned by other applications.

## Packaging Boundaries

Cloud Functions runtime code must not import root frontend source files unless they are packaged into the functions deployment artifact through an explicit shared package or build pipeline.
Functions source files under `functions/src` must not import files outside the `functions/` directory. This includes `../../src/**` and `../../packages/**` source imports. Shared code must be consumed only through a dependency that is included in the functions deployment artifact.

**Automation Guard:** The Functions import-boundary validation must run before Functions build/deploy. It prevents `functions/src` from importing root `src/**` or `packages/**` source files directly.
Projection recompute deployment must use the allowlisted Functions deploy workflow. Operational validation should begin with dryRun=true and selected targets only.

Before Functions code imports `@scan/efp-model`, the package must be present as a dependency inside the functions deployment artifact. Format compatibility alone is not sufficient.
`@scan/efp-model` is prepared into `functions/vendor/efp-model` before Functions dependency installation. Functions code may consume the package only through the declared `@scan/efp-model` dependency, never through `../../packages/**` or `../../src/**` source imports.
recomputeProjectionSummary must continue to consume shared EFP logic only through the declared @scan/efp-model dependency prepared under functions/vendor/efp-model.

## Allowed Deployments

This repository owns only a specific list of explicitly allowlisted Functions.

**Never use broad `firebase deploy --only functions` from this repository.** A broad deployment might overwrite or delete functions that belong to other applications in the shared Firebase project.

### Deployment Process

To enforce this, all deployments (both manual via `npm run deploy` and automated via GitHub Actions) are guarded by a validation script (`scripts/verify-functions-deploy-targets.mjs`).

This script reads the explicitly owned function names from `functions/deploy-functions.allowlist.json`. It validates the format, rejects broad deployment targets (like bare `functions`), and generates a safe string containing the exact named targets (e.g. `functions:getAppMetrics,functions:identifyMatches,...`).

## Risks of Name Collisions

Existing function names in this repository are legacy, non-prefixed names (e.g., `getAppMetrics`). Because they are generic, there is a risk that another application in the shared Firebase project might try to deploy a function with the same name.

To prevent collisions in the future, we should consider stronger isolation options:
- **App-specific function name prefix**: e.g., renaming `getAppMetrics` to `scanGetAppMetrics`.
- **Firebase Functions codebase separation**: Using the Firebase "codebases" feature to separate functions into logical groups.
- **Separate Firebase project**: Moving this application's resources to a completely dedicated Firebase project.
- **Explicit staged rename**: Any rename must be a carefully staged process where the old and new functions run in parallel until clients are fully migrated.

### Staged Rename Procedure

If a function rename is needed in the future, it must be treated as a separate migration and not bundled with ordinary runtime changes.

The safe migration order is:
1. Deploy new prefixed Function names alongside the old ones.
2. Update clients to call the new names.
3. Observe usage to ensure no traffic hits the old functions.
4. Delete old names explicitly in a separate PR/task.
