# Phase 7D: GitHub Actions Controlled Dry-run Preparation

## Scope

Phase 7D prepares a GitHub Actions based, controlled dry-run path for first controlled execution readiness review.

- Phase 7D is dry-run only.
- Phase 7D does not execute final migration writes.
- Phase 7D does not create imported observations.
- Phase 7D does not deploy anything by itself.
- Phase 7D prepares a workflow/manual path to inspect candidates through GitHub Actions.
- Final execution is deferred to Phase 7E.

## Non-goals

- no writes
- no execute mode
- no imported observation creation
- no AdminPanel/web execute UI
- no Firestore rules broadening
- no owner-wide execution
- no migrationRuns
- no summary backfill
- no rollback automation
- no anonymous sign-in
- no device ingestion
- no provisional objects
- no custody/loan model

## Operational assumption

- the app currently has one owner scope
- the dataset is small
- GitHub Actions is the intended admin-capable operational environment
- GitHub Actions uses a service account via repository secrets
- GitHub Actions service account is a GCP/IAM principal, not a Firebase Auth callable `request.auth.uid`
- therefore, direct callable invocation is not necessarily the right mechanism for GitHub Actions
- Phase 7D dry-run uses an Admin SDK/service-account, read-only harness

## Workflow policy

- workflow is `workflow_dispatch` only
- no `push` trigger
- no `pull_request` trigger
- no `schedule` trigger
- no execute mode
- no Firestore writes
- input `owner_id` must be explicit
- input `identifier_keys_json` must be explicit
- `identifier_keys_json` must be limited to at most 5 unique keys for controlled execution parity
- workflow prints a bounded dry-run summary
- workflow must not print secrets
- workflow must not store production data outside workflow logs except optional manually copied summaries

## Dry-run input contract

Workflow inputs:

- `owner_id`
- `identifier_keys_json`
- optional `max_batch_size` (default `5`, hard limit `5`)

Example:

```json
{
  "owner_id": "<target-owner-id>",
  "identifier_keys_json": "[\"<identifier-key-1>\", \"<identifier-key-2>\"]",
  "max_batch_size": "5"
}
```

## Dry-run output contract

Expected output summary:

- requested count
- checked count
- candidate count
- skipped count
- conflict count
- error count
- candidate observation IDs
- skipped reasons
- errors
- no write result
- no created records

## Relationship to Phase 7B

- Phase 7B introduced backend execute capability.
- Phase 7D does not use execute mode.
- Phase 7D prepares a GitHub Actions dry-run path.
- Phase 7E remains the separate final execution stage.

## Relationship to Phase 7E

- Phase 7E is the first phase that may perform actual imported observation creation through GitHub Actions.
- Phase 7E requires separate explicit approval.
- Phase 7E should reuse the same explicit input pattern prepared in Phase 7D.
- Phase 7E must preserve max batch size 5 or smaller.

## Implementation in this phase

- Workflow: `.github/workflows/phase-7d-imported-observation-dry-run.yml`
- Dry-run harness: `functions/src/phase7dControlledDryRun.ts`
- The harness:
  - accepts explicit owner/identifier inputs
  - rejects empty/invalid inputs
  - rejects >5 keys
  - computes deterministic IDs using functions-local `deterministicUuid`
  - keeps UUIDv5 deterministic payload `migrationPhase: "phase-6a"`
  - performs read-only candidate/skipped/conflict/error analysis
  - outputs bounded JSON summary
  - does not support execute mode
  - does not accept `confirmationText`
  - does not write Firestore data

## Phase 7D exit criteria

- Phase 7D document exists
- migration status updated
- AGENTS.md updated
- workflow/harness exists
- workflow is dry-run only
- no execute mode added to workflow
- no production data changed
- no callable function executed
- no deployment performed
- lint/build/functions build pass
- ready to decide Phase 7E final execution
