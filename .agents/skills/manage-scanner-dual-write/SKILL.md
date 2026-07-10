# manage-scanner-dual-write

## Purpose
Manage the rollout and validation of dual-write capabilities for the scanner and observation features during the database migration.

## When to use
Use this skill when:
- The user asks to validate the scanner observation dual-write feature.
- You need to prepare or evaluate the rollout design gate for dual-write.

## Inputs and assumptions
- All scripts are located in the `scripts/` directory at the repository root.
- Requires Node.js and execution via npm scripts.

## Procedure
To validate and roll out scanner dual-writes, run the following validation scripts in order as needed:
1. `npm run ops:validate-scanner-observation-target-rules-hardening-design`
2. `npm run ops:validate-scanner-observation-dual-write-readiness`
3. `npm run ops:validate-scanner-observation-dual-write-runtime-contract-evidence`
4. `npm run ops:validate-scanner-observation-dual-write-rollout-design-gate`

## Safety rules
- These scripts primarily perform validations and checks against the design contracts. 
- Do not output live production credentials.
- Before switching UI read logic to depend on the new dual-write fields, verify that all validation gates pass without error.

## Verification
- Look for successful exit codes (0) and success messages in the terminal output from the validation scripts.
- If a validation gate fails, correct the underlying implementation or design before proceeding.

## Related files
- `scripts/validate-scanner-observation-*.mjs`
- `package.json`
