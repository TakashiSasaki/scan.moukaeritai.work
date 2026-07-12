# repository-preflight

## Purpose
Establishes the initial safety baseline and validates the development starting state to prevent out-of-sync edits.

## When to use
At the very beginning of every task or stride prior to modifying any file.

## Inputs
- `AGENTS.md`
- `.agents/skills/manifest.json`
- `contracts/profiles/current-application.json`
- Current git tree state (`git status`)

## Procedure
1. Read the developer and agent guidelines in `AGENTS.md`.
2. Read the active skills manifest in `.agents/skills/manifest.json`.
3. Read the active current application contract profile in `contracts/profiles/current-application.json`.
4. Validate active contract schemas in `/contracts/packages/`.
5. Check current repository git status and record the base branch/commit HEAD.
6. Explicitly identify files that will be modified and files that must remain untouched.
7. Audit whether changes require a major, minor, or patch version bump.

## Stop conditions
- Git working tree is dirty (has uncommitted changes) prior to task initiation.
- Active contracts cannot be uniquely resolved or identified.
- Proposed changes require a major version bump (which is strictly forbidden without explicit human approval).
- User requests or direct instructions contradict architectural constraints set in `AGENTS.md`.

## Verification
- Run `npm run version:verify` to inspect current baseline alignment.
- Run `git status` to ensure working directory starts clean.

## Related scripts
- `npm run version:verify`

## Outputs
- Accurate preflight assessment in agent internal chain-of-thought.
