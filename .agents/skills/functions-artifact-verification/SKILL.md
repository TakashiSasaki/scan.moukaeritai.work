# functions-artifact-verification

## Scope
Verify Cloud Functions dependency boundaries and deploy artifact structure.

## Trigger
Use when changing Functions deployment shape, vendored package boundaries, deploy allowlists, or `@scan/efp-model` packaging used by Functions.

## Non-goals
- Do not run for every pure function logic edit.
- Do not run during normal documentation-only tasks.
- Do not add artifact isolation gates.
- Do not install all packages unless the artifact boundary changed.
- Do not deploy production functions.

## Commands
- `npm --prefix packages/efp-model run build`
- `npm run prepare:functions-artifact`
- `npm ci --prefix functions`
- `npm run test:functions-artifact`
- `npm run test:functions-boundary`
- `npm run test:functions-runtime-gate`
- `npm --prefix functions run build`

## Execution class
PR by default; release when validating deployment readiness.

## Mutation policy
read-only except generated local artifact preparation required by the commands.

## Stop condition
Stop if dependency resolution, deploy allowlist, boundary checks, or Functions build fails.

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
