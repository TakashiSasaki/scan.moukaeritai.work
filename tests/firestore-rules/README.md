# Firestore Rules Tests

This directory contains the emulator test foundation for the project's Firestore security rules.

## Overview

The tests assert the **current rules baseline** only. Stage 1 rules broadening (e.g., allowing client creation of additive v2 fields like `rawPayload` or global identifiers) is **intentionally not implemented** in this phase. The focus of these tests is solely to lock in the behavior of current constraints and ensure they are testable.

Future rules changes (such as Phase 7D.10 or Phase 7E execution) will update these tests to add allowances for v2 features.

## How to Run

The canonical command to run the rules tests is:

```bash
npm run test:rules
```

This command automatically:
1. Starts the local Firestore emulator via `firebase emulators:exec`.
2. Executes the Vitest test suite (`vitest run tests/firestore-rules/`) against the emulator.
3. Automatically shuts down the emulator when tests complete.

The tests use `@firebase/rules-unit-testing` to properly scope authenticated operations and assert successes and failures.

### Debugging & Advanced Usage

If you need to debug tests interactively with the emulator running:
1. Start the emulator suite in one terminal:
   ```bash
   npx firebase emulators:start --only firestore
   ```
2. In another terminal, run Vitest directly:
   ```bash
   npx vitest tests/firestore-rules/
   ```
   *Note: This directly runs Vitest and does not spawn a new emulator.*
