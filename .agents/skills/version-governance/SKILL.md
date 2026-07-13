# version-governance

## Purpose
Enforces strict semantic versioning, ensures synchronized metadata files, and verifies version consistency across workspace packages.

## When to use
Whenever code under sensitive paths is modified, or when starting/completing a stride.

## Inputs
- `package.json`
- `functions/package.json`
- `packages/efp-model/package.json`
- `contracts/profiles/current-application.json`
- `README.md`

## Procedure
1. Classify the nature of changes (bugfix, refactor, performance, new API feature, security closure, etc.).
2. Determine whether the modifications warrant a major, minor, or patch version bump.
3. Synchronize the exact version string across all versioned files (`package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json`, `packages/efp-model/package.json`, `contracts/profiles/current-application.json`, and `README.md`).
4. Execute `npm run version:verify` to guarantee full metadata integrity.

## Stop conditions
- A major version bump is detected (stops immediately; requires explicit human authorization).
- Sensitive path modifications exist but no version bump is proposed.

## Verification
- Run `npm run version:verify` and confirm output indicates `✅ Version bump verified!`.

## Related scripts
- `npm run version:verify`

## Outputs
- Updated synchronized version numbers across all package files.
