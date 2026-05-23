# Phase 7A: Backend Imported Observation Revalidation Dry Run

## Scope
Phase 7A implements backend-side revalidation dry-run for imported observation candidates. It introduces a new admin-only callable Cloud Function that revalidates existing identifiers server-side and returns a preview of proposed imported observations, similar to Phase 6A but without trusting client inputs.

## Non-goals
- no writes
- no imported observation creation
- no execute mode
- no execute/apply/repair UI
- no client Firestore rules broadening
- no anonymous sign-in
- no device ingestion
- no provisional objects
- no custody/loan model

## Function name
- `scanExecuteImportedObservationBatch`
- This name uses an app prefix to avoid collisions in shared GCP/Firebase projects.

## Deployment safety
- The GCP/Firebase project may contain Cloud Functions belonging to other applications.
- GitHub Actions must deploy functions by explicitly listing their names in the deployment command.
- Do not use broad functions deploy (`firebase deploy --only functions`).
- When updating the deployment workflow, the new function is explicitly added to the allow-list: `functions:scanExecuteImportedObservationBatch`.
- The target project must remain explicitly set.

## Request shape
The function strictly accepts a dry-run mode:
```ts
{
  mode: "dryRun",
  ownerId: string,
  identifierKeys: string[],
  maxBatchSize?: number
}
```

## Authorization
Server-side authorization ensures only admins can invoke the function:
- Unauthenticated requests result in an unauthenticated error.
- Non-admin requests (determined by checking the `admins/{uid}` collection) result in a permission-denied error.

## Revalidation rules
For each identifier key provided, the server:
- Reads `identifiers/{identifierKey}` and verifies it exists.
- Checks ownerId matches the request.
- Checks identifier status (only `active` and `unassigned` are allowed).
- Verifies required fields are present and valid.
- Verifies the identifier still has no real observations. Real observations are deduced by checking existing `identifierObservations` using both new-style (`ownerId`) and legacy (`observerUid`) queries and ensuring they are not marked with source `import` or observationType `imported`.
- The observation queries are bounded to 20 documents maximum.
- A direct document conflict check is performed against `identifierObservations/{observationId}` before accepting a candidate.
- Conservatively skips if conditions aren't met.

## Deterministic ID policy
A fixed UUIDv5 canonical JSON payload and namespace (`e23891cf-81cd-4231-b750-836376f90efe`) are used for observation ID generation, strictly adhering to `docs/architecture/deterministic-uuid.md`.

## Response shape
Returns a bounded and compact result structure detailing execution context, limits, count summaries, and lists of valid candidates, skipped identifiers, and execution errors.

## Phase 7A exit criteria
- function exists
- function is dry-run only
- no writes
- no execute mode
- functions build passes
- root lint/build pass
- ready to decide whether Phase 7B limited execute should be implemented
