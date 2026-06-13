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
- **Admin-only and Read-only**: The reconciliation callable is admin-only and does not write projection summaries to Firestore under any circumstance.
- **No Broad Backfill**: This operational validation remains single-target only; this tooling does not replace broad backfill.
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

## 9. Next Steps after Validation

If operational validations of `object`, `marker`, and `place` targets all succeed and match expected shapes, the next phase in the migration plan (automated reconciliation or broader backfill) can begin planning. Successful dry-run does not imply read switching readiness.
