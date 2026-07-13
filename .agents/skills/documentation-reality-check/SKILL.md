# documentation-reality-check

## Scope
Keep changed documentation aligned with implemented behavior and active policy.

## Trigger
Use when editing documentation or when code changes make an existing touched document inaccurate.

## Non-goals
- Do not audit every document on every task.
- Do not update README unconditionally.
- Do not duplicate version strings already available from canonical sources.
- Do not turn archived migration plans into active work.
- Do not run release documentation consistency for normal tasks.

## Commands
- Review the changed docs and directly related canonical files.
- `npm run test:documentation-state` only for PR/release or broad documentation changes.

## Execution class
fast for affected docs; PR/release for full documentation checks.

## Mutation policy
may modify documentation directly related to the current change.

## Stop condition
Stop if documentation claims completion or active scope that the implementation/tests do not support.

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
