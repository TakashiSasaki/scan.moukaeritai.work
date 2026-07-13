# run-local-tests

## Purpose
Runs localized unit, integration, and security rules testing across the entire codebase to detect regressions early.

## When to use
Whenever making active code edits or validating the local test suite.

## Inputs
- Test configurations (`vitest.config.ts`, `scripts/test-firestore-policy.mjs`)
- Local workspace files

## Procedure
1. To run standard unit/frontend tests:
   `npm run test`
2. To run routing authorization tests:
   `npm run test:routing`
3. To run routing boundary validations:
   `npm run test:routing-boundary`
4. To run Functions unit tests:
   `npm run test:functions`
5. To run Functions artifact validation:
   `npm run test:functions-artifact`
6. To run Functions runtime gate tests:
   `npm run test:functions-runtime-gate`
7. To run static policy verification for Firestore Security Rules:
   `npm run test:firestore-policy`

## Stop conditions
- Any test fails or throws compilation errors.

## Verification
- Check command output logs for successful exit codes and passing assertions.

## Related scripts
- `npm run test`
- `npm run test:routing`
- `npm run test:routing-boundary`
- `npm run test:functions`
- `npm run test:functions-artifact`
- `npm run test:functions-runtime-gate`
- `npm run test:firestore-policy`

## Outputs
- Passing test logs or identified errors for debugging.
