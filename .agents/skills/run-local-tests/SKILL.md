# run-local-tests

## Scope
Select and run tests relevant to the files changed by the current task.

## Trigger
Use after edits or when validating a local change.

## Non-goals
- Do not run every test for every task.
- Do not run migration, dual-write, backfill, or reconciliation gates during normal task validation.
- Do not expand Firestore pseudo-emulators because Java is unavailable locally.
- Do not fix unrelated failures.
- Do not run release verification unless requested.

## Commands
Default daily check:
- `npm run verify:fast`

Changed-path mapping:
- `src/components/**` -> `npm run test`, `npm run lint`
- `src/routing/**`, `src/lib/routeCatalog.ts` -> `npm run test:routing`, `npm run test:routing-boundary`, `npm run lint`
- `functions/src/**` -> `npm --prefix functions run build`, `npm run test:functions`
- `packages/efp-model/**` -> `npm --prefix packages/efp-model run build`, `npm --prefix packages/efp-model run test`, `npm --prefix packages/efp-model run typecheck`
- `contracts/**` -> `npm run contracts:validate`, `npm run contracts:check-generated`
- `firestore.rules` -> `npm run test:firestore-policy`; emulator tests run in CI
- release metadata or broad governance changes -> `npm run verify:release`

## Execution class
fast by default; PR or release when changed-path mapping requires it.

## Mutation policy
read-only

## Stop condition
Stop when a relevant test fails; report the failing command and do not broaden scope unless the failure is caused by the current change.

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
