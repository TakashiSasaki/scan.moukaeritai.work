# Projection Recompute Operational Validation

## 1. Purpose

The `recomputeProjectionSummary` callable is an admin-only backend function that reconstructs the state of an Object, Marker, or Place from underlying Facts.

Before performing any broad data backfills or switching client UI reads to rely on these summaries, the projection logic must be operationally validated. This document explains how an operator can safely invoke the deployed callable to validate its outputs against a known test target.

## 2. Preconditions

- The callable is deployed to the target Firebase environment.
- The administrator invoking the callable has a valid authenticated session.
- The `admins/{uid}` document exists for the invoker's UID.
- The `targetId` points to an existing `object`, `marker`, or `place` owned by the test user.

## 3. Safety Constraints

- **Input Contract**: The callable input contract is strictly validated by a pure, dependency-free helper covered by ordinary unit tests (`tests/projectionRecomputeInput.test.ts`).
- **Fact Query Plan**: The recompute Fact query plan logic is covered by ordinary unit tests (`tests/projectionRecomputeFactPlan.test.ts`).
- **Start with `dryRun=true`**: This is the default. Do not proceed to `dryRun=false` until you have verified the dry-run output against expected values.
- **Use only known test targets first**: Use a staging or development object where possible, or a non-critical production object if explicitly testing real-world shape.
- **Single-Target Reconciliation Available**: Use the read-only `reconcileProjectionSummary` callable to compare recomputed EFP projection summaries with the currently stored summaries and return a structural difference report.
- **Selected-Target Batch Reconciliation Available**: Use the read-only `reconcileProjectionSummaries` callable for explicit selected-target reconciliation. It processes up to 20 targets, does not scan collections, and has hard target-count limits.
- **Admin-only and Read-only**: The reconciliation callables are admin-only and do not write projection summaries to Firestore under any circumstance.
- **No Broad Backfill**: This operational validation remains focused on selected targets only; this tooling does not replace broad backfill.
- **No UI Read Switching Authorization**: Successful reconciliation validations do not authorize UI read switching by themselves. Broad backfill and UI read switching remain future work.

- **`dryRun=false` writes exactly one summary document**: It creates or overwrites one record in `objectSummaries`, `markerSummaries`, or `placeSummaries` when using `recomputeProjectionSummary`.
- **Use the existing deploy-functions workflow**: Do not manually run broad `firebase deploy --only functions`. Rely on the CI/CD pipeline or use the allowlisted deploy script.

## 4. Deploy Prerequisite

Projection recompute deployment must use the allowlisted Functions deploy workflow. Do not run manual deploy commands outside the standard procedure outlined in `docs/deployment/firebase-functions-deploy-safety.md`.

## 5. Dry-run Validation Examples

Generate payload and manual invocation instructions for dry-run (defaults to true):

```bash
npm run ops:recompute-projection -- --target-type object --target-id <objectId>
npm run ops:recompute-projection -- --target-type marker --target-id <markerKey>
npm run ops:recompute-projection -- --target-type place --target-id <placeId>
```

You can then run the output JSON via an authenticated `curl` command or your preferred REST client.

## 6. `dryRun=false` Single-target Write Example

Once dry-run is validated and you are certain the target summary is correct, you can generate the payload for a write action:

```bash
npm run ops:recompute-projection -- --target-type object --target-id <objectId> --dry-run false
```

## 7. Expected Callable Response Shape

A successful invocation returns a structured JSON payload:

```json
{
  "result": {
    "success": true,
    "dryRun": true,
    "targetType": "object",
    "targetId": "sample-id",
    "summaryPath": "objectSummaries/sample-id",
    "summary": {
      "objectId": "sample-id",
      "asOf": { "_seconds": 1700000000, "_nanoseconds": 0 }
    },
    "factsRead": {
      "associations": 1,
      "observations": 5,
      "measurements": 0,
      "events": 0
    },
    "written": false
  }
}
```

If the target entity does not exist, the callable throws an `HttpsError` (`not-found`).

## 8. What Not to Do

- Do not write scripts that loop over thousands of records calling this function. A proper backfill will require a dedicated strategy (e.g., batched queue or migration task).
- Do not store or commit access tokens in scripts. The helper script generates the payload, keeping credential management manual and external.

## 9. Reconciliation Reporting

Operators can run selected-target batch reconciliation and save the response to a JSON file. To summarize the results locally without calling Firebase, use the local reporting tool:

```bash
npm run ops:report-projection-reconciliation -- --input path/to/reconcile-response.json
```

**Constraints:**
- Selected-target reconciliation responses can be saved to JSON.
- `ops:report-projection-reconciliation` summarizes saved responses locally.
- The report tool is local-only and does not call Firebase.
- Report `pass`/`attention`/`fail` status is an operational validation aid.
- Passing selected-target reports still does not authorize UI read switching.
- Passing selected-target reports still does not replace broad backfill.

## 10. Canary Write Planning

Use `npm run ops:plan-projection-canary-writes -- --input <path>` to generate local canary write plans from saved reconciliation responses/reports.
* It does not call Firebase.
* It does not perform writes.
* It generates `dryRun:false` payloads for manual canary use only.
* Canary write planning does not authorize broad backfill.
* Canary write planning does not authorize UI read switching.
* Keep canary target count small, with hard max 5.

## 11. Canary Write Validation

After generating a canary plan and explicitly running the selected manual canary writes, you must validate the outcome using:

```bash
npm run ops:validate-projection-canary-writes -- \
  --plan path/to/canary-plan.json \
  --post-write path/to/post-write-reconcile-response.json
```

**Constraints:**
- `ops:validate-projection-canary-writes` validates saved canary evidence locally.
- It consumes a saved canary plan and saved post-write reconciliation response/report.
- It does not call Firebase.
- It does not perform writes.
- Passing canary validation does not authorize broad backfill.
- Passing canary validation does not authorize UI read switching.

## 12. Backfill Readiness Assessment

Use `npm run ops:assess-projection-backfill-readiness -- --manifest <path>` to assess saved local evidence for readiness to design backfill.
* It consumes saved reconciliation reports and canary validation bundles.
* It produces a conservative `ready-for-backfill-design`, `blocked`, or `fail` assessment.
* It does not call Firebase.
* It does not perform writes.
* It does not perform backfill execution.
* `ready-for-backfill-design` does not authorize backfill execution.
* `ready-for-backfill-design` does not authorize UI read switching.

## 13. Backfill Planning

Use `npm run ops:plan-projection-backfill -- --readiness <path> --targets <path>` to generate batched projection backfill payloads based on assessed readiness and explicit target lists.
* It is a local-only tool.
* It does not call Firebase.
* It does not perform writes.
* It does not execute backfill.
* `dryRun` mode is the default.
* `manual-write-plan` mode only emits payloads and does not execute them.
* No UI read switching is authorized.

## 14. Backfill Operation Packet Preparation

Use `npm run ops:prepare-projection-backfill-operation` to prepare a purely local operation packet. It consumes readiness evidence and explicit targets/plan.
* It does not call Firebase.
* It does not perform writes.
* It does not execute backfill.
* It does not authorize UI read switching.

## 15. Backfill Operation Validation

Use `npm run ops:validate-projection-backfill-operation` to locally validate saved operation packet evidence against expected targets and states.
* It is a local-only tool.
* It does not call Firebase.
* It does not perform writes.
* It does not execute backfill.
* It does not authorize UI read switching.
* `dry-run-evidence-pass` validates dry-run evidence only.
* `manual-write-evidence-pass` validates saved manual-write evidence only.
* Actual backfill execution design, rollback policy, and UI read switching gate remain future work.

## 17. Backfill Execution Design Gate

Use `npm run ops:assess-projection-backfill-execution-design` to assess saved operation validation bundles for readiness to begin execution design.
* It is local-only.
* It does not call Firebase.
* It does not write.
* It does not execute backfill.
* It does not authorize UI read switching.
* `ready-for-execution-design` is not execution approval.

## 16. Next Steps after Validation

If operational validations of `object`, `marker`, and `place` targets all succeed and match expected shapes, the next phase in the migration plan (automated reconciliation or broader backfill) can begin planning. Successful dry-run does not imply read switching readiness.
