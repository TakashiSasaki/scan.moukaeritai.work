# Phase 6A: Imported Observation Dry Run

## Scope

Phase 6A computes preview candidates for deterministic imported baseline observations based on the current existing identifiers. This serves as a read-only dry-run to identify which identifiers could receive a deterministic imported baseline observation, and to preview what those deterministic UUIDv5 observation IDs and payloads would look like.

## Non-goals

* No data writes are performed in this phase.
* No actual imported observations are created.
* No synthetic observations are created.
* No execute, apply, or repair controls are provided.
* Firestore rules are not broadened to permit client-created imported writes.
* There is no Cloud Function execute path yet.
* Anonymous sign-in is not implemented.
* Device/sensor ingestion is not implemented.
* Provisional objects are not implemented.
* Custody/loan workflows (e.g. `currentCustodianUid`) are not implemented.

## Candidate target policy

* Only identifiers with **no real observations** are treated as candidates.
* If an identifier already has one or more real (non-imported) observations, it is skipped.
* Identifiers with `status == "active"` or `status == "unassigned"` may be candidates.
* Identifiers with `status == "retired"`, `status == "lost"`, or `status == "replaced"` are conservatively skipped in Phase 6A.
* Candidates are bounded by default limits to maintain fast read performance and are restricted to owner-scoped records.

## Timestamp policy

* `observedAt` is never `null`.
* The `observedAt` value is derived from a reliable source, prioritizing `identifier.createdAt`.
* If a reliable timestamp is missing, the candidate is skipped.
* For preview payloads, the `receivedAt` and `createdAt` fields are populated with future execute-time placeholder strings, to clarify that they represent execution time.

## Deterministic ID policy

* The `observationId` is generated using UUIDv5.
* The namespace UUID comes from the permanent `docs/architecture/deterministic-uuid.md` policy.
* The UUIDv5 name payload strictly uses canonical JSON representation.
* The ID payload includes `ownerId` and `identifierKey` to identify the baseline.
* The ID payload correctly excludes interpretation-dependent fields like `observedAt` and `objectId`.

## Proposed observation metadata

For review, candidates compute a proposed observation payload containing:

```json
{
  "migration": {
    "name": "observation-model-migration",
    "phase": "phase-6a",
    "version": "v1",
    "baseline": "tag-1.0.0",
    "importedFrom": "identifiers",
    "sourceIdentifierKey": "<identifierKey>",
    "sourceObjectId": "<objectId (if active)>",
    "timestampSource": "identifier.createdAt",
    "observedAtIsInferred": true,
    "deterministicIdNamespace": "e23891cf-81cd-4231-b750-836376f90efe",
    "deterministicIdPayloadSchemaVersion": 1
  }
}
```

## UI usage

An "Imported Observation Dry Run" component has been added to the Admin Control Panel. It allows users to execute the dry-run, which computes and limits results to provide a snapshot of checked counts, proposed candidates with their deterministic IDs and payloads, skipped identifiers (with reasons), and any warnings.

## Phase 6A exit criteria

* The dry-run module `src/lib/importedObservationDryRun.ts` exists.
* The `AdminPanel` preview UI component exists.
* Deterministic UUIDv5 IDs are correctly computed using canonical JSON payloads.
* No actual writes are performed in the database.
* Imported observations are not written/created.
* The `npm run lint` and `npm run build` steps pass.
* The codebase is ready for Phase 6B or Phase 7 execution planning.