# Versioning Policy

This policy governs the versioning of application releases and individual contracts in `scan.mw`.

## Application Versioning

1. **SemVer Standard**: The application follows Semantic Versioning 2.0.0 (MAJOR.MINOR.PATCH).
2. **Strict Increments**: Every pull request or stride merged into `main` that modifies application code or contracts **MUST** increment the application version in the root `package.json`.
3. **Change Verification**: CI runs `npm run version:verify` to guarantee that code changes are accompanied by an appropriate version bump relative to the target branch.
4. **Major Version Governance**: Any Major version bump (e.g., 2.x.x to 3.x.x) **REQUIRES EXPLICIT HUMAN APPROVAL**. An AI coding agent MUST NOT execute a major bump unless there is a verifiable, pre-existing human approval record in the base branch. Minor and Patch version bumps can be judged and executed autonomously by agents.
5. **Scope Exclusions**: Changes purely inside markdown documentation files (e.g. `README.md`, `AGENTS.md`, or policy files) are excluded from the mandatory version bump requirement.

## Contract Versioning

Each contract package is versioned independently of the application.
- **Major**: Backwards-incompatible schema changes or semantic changes (e.g. EFP model 2.0.0).
- **Minor**: Additive fields or backward-compatible modifications.
- **Patch**: Description updates, spelling corrections, and non-breaking documentation changes.
6. **Workspace Package Versioning**: Workspace packages (e.g. `functions`, `packages/efp-model`) MUST share the same application version as the root `package.json`. This is verified by the version verifier.
