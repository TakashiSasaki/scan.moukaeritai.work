# stride-closeout

## Purpose
Establishes a solid, multi-phase verification closeout process to ensure every logic change is fully tested, clean, version-aligned, and safely committed with zero remaining scratch files.

## When to use
At the end of every stride or before completing the user's task.

## Inputs
- Full workspace state
- Git history and working tree

## Procedure
1. Run `git diff` and carefully review all modifications.
2. Clean up and purge any temporary files, scratch artifacts, or unused files.
3. Verify that the version matches across all packages and configuration files.
4. Run schema checks and validate contracts.
5. Execute local unit tests for the frontend and EFP package.
6. Execute routing and authorization integration tests.
7. Prepare the Cloud Functions build artifact.
8. Build Cloud Functions and run backend tests.
9. Verify Firestore rules (if the emulator is available; otherwise note execution limits).
10. Execute the hardened repository hygiene check.
11. Run the documentation reality check to ensure claims align with realities.
12. Check `git status` to confirm only expected modifications are present.
13. Prepare a comprehensive, descriptive commit message detailing changes and make a single logical commit.
14. Run `git status --short` after committing to guarantee that the working tree is completely clean.
15. Check GitHub Actions pipeline results (or report status if pending). Do not report "green" without confirming the actual CI checks passed.

## Stop conditions
- Git status is not completely clean after committing.
- Any unit, integration, or contract verification test fails.
- Prohibited artifacts remain in the directory.

## Verification
- Run `git status --short` and confirm it is completely clean.

## Related scripts
- `npm run verify:baseline`

## Outputs
- Clean, committed logic change with a professional commit message.
