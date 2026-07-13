# manage-efp-migration

## Purpose
Guide the execution and validation of the Entity-Fact-Projection (EFP) runtime migration, including canary writes, backfill operations, and data reconciliation.

## When to use
Use this skill when:
- The user requests to run projection migrations or recomputations.
- You need to perform canary writes for new projection logic.
- You are backfilling historical data into the EFP model.
- You need to validate or audit EFP drift.

## Inputs and assumptions
- All scripts are located in the `scripts/` directory at the repository root.
- Requires Node.js and execution via `npm run <script>` or `node scripts/<script>.mjs`.
- Make sure to review any specific runbook (e.g. `docs/operations/projection-backfill-operation-runbook.md`) before running backfill scripts.

## Procedure
1. **Canary Writes Validation**:
   - Run `npm run ops:plan-projection-canary-writes`
   - Run `npm run ops:validate-projection-canary-writes`
2. **Recompute & Reconcile**:
   - Run `npm run ops:recompute-projection`
   - Run `npm run ops:reconcile-projection`
   - Run `npm run ops:report-projection-reconciliation`
3. **Backfill Readiness & Operation**:
   - Run `npm run ops:assess-projection-backfill-readiness`
   - Run `npm run ops:plan-projection-backfill`
   - Run `npm run ops:prepare-projection-backfill-operation`
   - Run `npm run ops:validate-projection-backfill-operation`
4. **Drift Audit**:
   - Run `npm run ops:validate-efp-drift-audit`
   - Run `npm run ops:validate-efp-drift-closure-plan`

## Safety rules
- Do not run backfill operations blindly. Always run the "plan" or "assess" scripts first (dry-run approach) before executing writes.
- Operations should be executed with appropriate IAM permissions; check if local credentials or `.env` files are properly configured for admin SDK access.
- Avoid exposing any PII or production data in console outputs or agent logs. Use summary metrics instead of raw records where possible.

## Verification
- Verify the output of the planning scripts confirms zero unintended destruction.
- Drift audits should report zero discrepancies.
- If reconciliation scripts report issues, pause and address the data model logic.

## Related files
- `scripts/*.mjs` (various projection and backfill scripts)
- `docs/architecture/entity-fact-projection-data-model.md`
- `docs/migrations/entity-fact-projection-runtime-migration-plan.md`
- `docs/operations/*.md` (Runbooks)
