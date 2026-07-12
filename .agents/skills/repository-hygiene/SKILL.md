# repository-hygiene

## Purpose
Guarantees clean workspace directories, eliminates untracked or scratch files, and validates that only allowlisted root files are committed.

## When to use
Before wrapping up any task, or during any comprehensive baseline verification run.

## Inputs
- Workspace root files
- `.gitignore`
- `scripts/test-repository-hygiene.mjs`

## Procedure
1. Inspect the working directory for tracked, untracked, and modified files using `git status`.
2. Classify all root-level files.
3. Automatically delete known scratch or temporary files (e.g., `*.tmp`, `patch*.js`, `reply_payload*.json`, etc.).
4. Review changes with `git diff --stat` to verify no accidental leakage has occurred.
5. Execute the hygiene gate test script: `npm run test:repository-hygiene`.

## Stop conditions
- Prohibited root files or content configurations are detected.
- Hygiene gate execution fails.

## Verification
- Run `npm run test:repository-hygiene` and ensure it passes successfully with no violations.

## Related scripts
- `npm run test:repository-hygiene`

## Outputs
- Clean workspace state with zero temporary files or prohibited commands.
