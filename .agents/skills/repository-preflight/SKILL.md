# repository-preflight

## Scope
Confirm the starting state before edits: branch, working tree, base diff, applicable `AGENTS.md`, active profile, and relevant skills.

## Trigger
Use at the beginning of a change request before modifying files.

## Non-goals
- Do not audit the whole repository.
- Do not run release verification.
- Do not create a contract version.
- Do not require a version bump for documentation, test, or internal metadata changes.
- Do not start migration, backfill, reconciliation, or dual-write work.

## Commands
- `git status --short --branch`
- `git branch --show-current`
- `git diff --stat`
- Read `AGENTS.md`, `.agents/skills/manifest.json`, and `contracts/profiles/current-application.json` only as needed.

## Execution class
fast

## Mutation policy
read-only

## Stop condition
Stop if the working tree contains unrelated user changes, the branch conflicts with instructions, or active instructions contradict each other.

## Purpose
See Scope above; this skill is now tiered and bounded by execution class.

## When to use
See Trigger above.

## Inputs
- Current task instructions
- Changed files and relevant canonical sources


## Procedure
Follow the Scope, Trigger, Non-goals, Commands, Execution class, Mutation policy, and Stop condition sections above. Prefer the narrowest relevant command set.

## Stop conditions
See Stop condition above.

## Verification
Use only the relevant commands listed above for the current execution class.

## Related scripts
- `npm run verify:fast`
- `npm run verify:pr`
- `npm run verify:release`


## Outputs
A bounded result for the current task without creating unrelated work.
