# run-local-tests

## Purpose
Run local unit tests and Firebase rules tests to ensure the application logic and security constraints are functioning correctly.

## When to use
Use this skill when:
- Making changes to Firestore security rules (`firestore.rules`).
- Making changes to domain logic or utility functions.
- Before committing changes that affect data models or backend boundaries.
- The user asks to "run tests" or "verify rules".

## Inputs and assumptions
- Requires Node.js and `npm` (or `vitest` command).
- Requires Firebase CLI for emulators (if running rules tests).
- Local environment variables may need to be loaded from `.env` or defaults.

## Procedure
1. To run standard unit tests:
   Execute `npm run test` or `npm run test:coverage`.
2. To run boundary and dependency validation tests:
   Execute `npm run test:functions-boundary` and `npm run test:functions-efp-model`.
3. To run Firestore rules tests (requires emulators):
   Execute `npm run test:rules`.

## Safety rules
- Do not output full test logs if they contain secrets or tokens.
- Tests must be run in a non-destructive environment. The emulator handles isolating rules testing.
- Do not perform live mutations on production Firebase while running unit tests.

## Verification
- Look for `PASS` or `FAIL` output from Vitest.
- If a test fails, identify the specific assertion or compilation error and fix it before continuing.

## Related files
- `vitest.config.ts`
- `vitest.rules.config.ts`
- `firestore.rules`
- `package.json` (for npm scripts)
