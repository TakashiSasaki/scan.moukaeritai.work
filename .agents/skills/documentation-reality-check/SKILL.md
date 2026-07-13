# documentation-reality-check

## Purpose
Prevents false claims, over-promising, or misleading documentation by auditing project files against the actual, tested, and implemented reality of the runtime.

## When to use
Before finishing any task, when writing README updates, and during milestone reporting.

## Inputs
- `README.md`
- `AGENTS.md`
- Test files under `tests/` and `functions/test/`

## Procedure
1. Audit all claims of "complete" or "closed" workflows in documentation. Verify there are corresponding, passing tests for each.
2. Cross-examine version claims. Ensure the current version in package files matches those referred to in doc headers.
3. Verify that `README.md`, `AGENTS.md`, active contracts, and current runtime files represent exactly the same codebase state.
4. If a feature is partially implemented or deferred, explicitly label it as such. Do not write unimplemented features as completed.

## Stop conditions
- Documentation claims a feature is complete, but no passing test or implementation exists.
- Discrepancy detected between what the contracts declare and what the runtime enforces.

## Verification
- Double check that README/AGENTS files explicitly document handoffs and pending/incomplete features.

## Related scripts
- `npm run verify:baseline`

## Outputs
- Accurate, humble, and objective project documentation matching the exact state of code execution.
