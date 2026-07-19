# repository-hygiene

## Scope
Prevent accidental scratch files, prohibited root files, and unrelated changes from entering a commit.

## Trigger
Use during task closeout and release verification.

## Non-goals
- Do not run mutation self-tests during normal task closeout.
- Do not delete files that may be user work without review.
- Do not perform full documentation or version audits.
- Do not run migration gates.

## Commands
- `git status --short`
- `git diff --stat`
- `npm run verify:fast` for normal task closeout.
- `npm run verify:pr` for PR closeout or when root files changed.
- `npm run verify:release` for release preparation.

## Execution class
fast for status/diff; PR or release for the full hygiene script.

## Mutation policy
read-only by default; may remove only clearly generated scratch files after review.

## Stop condition
Stop if untracked or modified files cannot be attributed to the current task.

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
