# version-governance

## Scope
Keep release version metadata understandable without forcing every internal change to bump versions.

## Trigger
Use for release candidates, externally visible compatibility/API changes, or explicit version metadata changes.

## Shared policy
Refer to `.agents/policies/complexity-control.md` for repository-wide complexity-control non-goals.

## Non-goals
- Do not require version bumps for ordinary internal fixes, tests, or docs.
- Do not synchronize versions across unrelated packages by default.
- Do not treat lockfiles as version sources of truth.
- Do not duplicate application versions into README manually.
- Do not bump Callable API versions for internal-only changes.

## Commands
- `npm run version:verify` for release/external compatibility changes.
- `npm run verify:release` before release candidates.

## Execution class
release

## Mutation policy
may modify version metadata only when the trigger applies.

## Stop condition
Stop if a required external compatibility version decision is unclear or a major version would be required without human approval.

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
