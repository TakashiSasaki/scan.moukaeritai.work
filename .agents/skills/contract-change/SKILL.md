# contract-change

## Scope
Maintain contract schemas, active profile mappings, registry entries, and generated types when externally visible data/API formats change.

## Trigger
Use when modifying `contracts/**` or API/database payload formats consumed outside an implementation detail.

## Non-goals
- Do not create a new contract version for internal metadata, tests, or documentation-only changes.
- Do not add new migration phases.
- Do not add new gates or mutation fixtures.
- Do not reconnect archived import protocols to the active runtime profile.
- Do not treat application version and contract version as the same source of truth.

## Commands
- `npm run contracts:validate`
- `npm run contracts:check-generated`
- Add changed-package tests only when runtime bindings changed.

## Execution class
fast for affected validation; PR for contract/runtime drift checks; release for full historical compatibility.

## Mutation policy
may modify files in `contracts/**` and generated bindings when required by the change.

## Stop condition
Stop if schema validation fails, generated bindings are stale, or a backward-incompatible external change would require a major version without approval.

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
