# Tests

This directory provides the test specifications for the application.

## Test Separation

The application maintains a strict separation between pure unit tests and Firestore rules emulator tests.

### Ordinary Unit Tests
- **Command**: `npm run test`
- **Purpose**: Fast, pure unit tests for deterministic helpers, logic, and data structures.
- **Constraints**:
  - Must not require the Firebase emulator.
  - Must not require browser APIs or production Firebase connections.
  - Should run entirely offline using standard Vitest.

### Coverage
- **Command**: `npm run test:coverage`
- **Purpose**: Runs the ordinary unit tests and generates a test coverage report (lcov, json-summary, text).

### Firestore Rules Tests
- **Command**: `npm run test:rules`
- **Purpose**: Tests specifically targeting `firestore.rules` using the local Firestore emulator.
- **Constraints**:
  - Does not require the Firebase emulator to be already running.
  - The `npm run test:rules` script automatically starts the emulator, runs the suite, and shuts it down.
  - Located strictly under `tests/firestore-rules/`.
  - These tests assert the **current baseline only**. Stage 1 rules broadening (like allowing client writes for additive v2 fields or global identifiers) is **intentionally omitted** here.

### Linting and Building
- **Lint**: `npm run lint` strictly runs TypeScript type checking (`--noEmit`) without modifying files.
- **Build**: `npm run build` generates PWA icons and builds the application for production using Vite.

## Continuous Integration (CI)

Our non-deploying CI workflow automatically runs the following validation commands on every push and pull request:
1. `npm run lint`
2. `npm run test`
3. `npm run test:coverage` (with artifacts automatically uploaded)
4. `npm run test:rules`
5. `npm run build`

For detailed information on rules debugging and testing, see [tests/firestore-rules/README.md](firestore-rules/README.md).