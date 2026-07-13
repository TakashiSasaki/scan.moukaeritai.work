# stride-closeout

## Scope
Close work at the right verification tier instead of forcing release validation on every task.

## Trigger
Use before completing a task, preparing a PR, or preparing a release.

## Non-goals
- Do not run `verify:release` for normal tasks.
- Do not require version bumps for every sensitive-path edit.
- Do not add new gates, mutation fixtures, or completion evidence formats.
- Do not fix unrelated failures.
- Do not treat archived migration work as pending closeout.

## Commands
Task closeout:
- `git diff --stat`
- relevant tests from `run-local-tests`
- `git status --short`

PR closeout:
- `npm run verify:pr`
- confirm CI-only Firestore Emulator checks are configured when rules changed
- review security-sensitive changes

Release closeout:
- `npm run verify:release`
- artifact isolation
- full documentation consistency
- version consistency
- repository-wide validation

## Execution class
fast for task closeout; PR for pull requests; release for release candidates.

## Mutation policy
read-only except for final commit creation requested by the task.

## Stop condition
Stop if relevant tests fail, unexpected files are present, or release-only requirements are being applied to a normal task without explicit request.

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
