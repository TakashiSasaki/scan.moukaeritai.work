# Versioning Policy

This policy governs the versioning of application releases and individual contracts in `scan.mw`.

## Application Versioning

1. **SemVer Standard**: The application follows Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH).
2. **Strict Increments**: Every pull request or stride merged into `main` that modifies application code or contracts **MUST** increment the application version in the root `package.json`.
3. **Change Verification**: CI runs `npm run version:verify` to guarantee that code changes are accompanied by an appropriate version bump relative to the target branch.
4. **Scope Exclusions**: Changes purely inside markdown documentation files (e.g. `README.md`, `AGENTS.md`, or policy files) are excluded from the mandatory version bump requirement.

## Contract Versioning

Each contract package is versioned independently of the application.
- **Major**: Backwards-incompatible schema changes or semantic changes (e.g. EFP model 2.0.0).
- **Minor**: Additive fields or backward-compatible modifications.
- **Patch**: Description updates, spelling corrections, and non-breaking documentation changes.
