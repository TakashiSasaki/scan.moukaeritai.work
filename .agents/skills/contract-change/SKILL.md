# contract-change

## Purpose
Manages evolution, serialization, validation, and runtime synchronization of the canonical schema registry inside `/contracts`.

## When to use
When updating database structures, Callable API inputs, JSON schemas, or normative contract Markdown files.

## Inputs
- `/contracts/registry.json`
- `/contracts/profiles/current-application.json`
- `/contracts/packages/`
- Valid & invalid JSON fixtures

## Procedure
1. Determine if the active contract version can be overwritten under governance (e.g., patch-level changes) or requires creating a new patch/minor version directory.
2. Update the contract package registry file `contracts/registry.json`.
3. Update the active application profile `contracts/profiles/current-application.json`.
4. Modify the normative contract Markdown file (e.g., `callable-functions-api.md`).
5. Update or create the schema `.schema.json` files.
6. Provide or synchronize corresponding valid and invalid JSON test fixtures.
7. Execute `npm run contracts:validate` to ensure AJV compiles and validates all schemas.
8. Execute `npm run contracts:check-generated` to verify typescript bindings.
9. Deploy or copy schemas to the Cloud Functions vendor path as part of the artifact preparation.
10. Ensure the runtime logic strictly matches the contract boundaries (ignoring/rejecting invalid inputs).

## Stop conditions
- Schema validation fails or AJV compilation errors occur.
- Existing contract package directories are overwritten in a backward-incompatible way without a version bump.

## Verification
- Run `npm run contracts:validate`
- Run `npm run contracts:check-generated`

## Related scripts
- `npm run contracts:validate`
- `npm run contracts:check-generated`

## Outputs
- Updated canonical contracts, schemas, validation fixtures, and generated typescript types.
