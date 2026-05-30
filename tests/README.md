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

### Firestore Rules Tests
- **Command**: `npm run test:rules`
- **Purpose**: Tests specifically targeting `firestore.rules` using the local Firestore emulator.
- **Constraints**:
  - Requires the Firebase emulator to be running.
  - The `npm run test:rules` script automatically starts the emulator, runs the suite, and shuts it down.
  - Located strictly under `tests/firestore-rules/`.
  - These tests assert the **current baseline only**. Stage 1 rules broadening (like allowing client writes for additive v2 fields or global identifiers) is **intentionally omitted** here.

For detailed information on rules debugging and testing, see [tests/firestore-rules/README.md](firestore-rules/README.md).
