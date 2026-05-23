# Phase 5: Dry-run Backfill Migration

## Scope

This phase implements a bounded, owner-scoped, admin-only dry-run backfill planner that computes proposed updates for optional observation-related fields. Crucially, **it performs zero writes to Firestore**. It strictly operates as a read-only analysis to preview what an actual backfill might propose.

## Non-goals

This phase explicitly **does not implement**:
- Actual data mutation or writes to the database.
- Any execute mode, execute buttons, or backfill-now controls in the UI.
- Data repair operations.
- Imported observations (Phase 6).
- Synthetic observations derived from old data.
- Anonymous sign-in flows.
- Device or sensor ingestion.
- Provisional object workflow.
- Custody or loan models.
- "objects.lastObservationSummary" active runtime cache logic.

## Dry-run Scope

- **Bounded:** Limits reads to conservative numbers (e.g., max 50 identifiers/objects) per run to prevent excessive read quota consumption.
- **Current-user / Owner-scoped:** Operates only over the data owned by the currently authenticated user in the Admin UI. It does not perform a global, database-wide scan.
- **Read-only Preview:** It is intended to prepare and review the logic for later limited execution (Phase 7).

## Candidate Categories

### Identifier Candidates

For sampled `identifiers/{identifierKey}` owned by the current user, the dry run will compute proposed patches where inference is safe:

1. **`discoveryState`:**
   - Proposes `"observed"` if the identifier is unassigned, has no `objectId`, but has real `identifierObservations`.
   - Proposes `"registered"` if `status` is `"active"` and `objectId` exists.
   - Proposes `"detached"` with medium confidence if the status is `"replaced"`, as this clearly implies detachment in the current model.
   - For inactive statuses like `"retired"` or `"lost"`, the discovery state inference is conservative, and these ambiguous states are skipped to avoid incorrect assumptions.
   - Mixed-confidence candidate patches set their overall `confidence` to the lowest confidence of their proposed fields (e.g., a mix of `high` and `medium` yields `medium`).

2. **First/Last Observation metadata (`firstObservedAt`, `lastObservedAt`, `lastObservedSource`, etc.):**
   - Deduced **only** from real, existing `identifierObservations`.
   - Populated observation fields are generally not overwritten unless they appear stale, in which case a candidate warning may be noted.

### Object Candidates

For sampled `objects/{objectId}` owned by the current user, the dry run proposes:

1. **`visibility`:** Defaults to `"private"` if entirely missing.
2. **`ownerUid`:** Safely propagated from `ownerId` if missing.
3. **`createdBy`:** Inferred safely (often from `ownerId`). Otherwise, skipped.
4. **`lastReportedAt` / `lastReportedBy` / `lastReportedPlaceLabel`:**
   - Deduced **only** from real existing observations related to the active identifiers bound to the object.
5. **`identifierSummary`:** Compares the stored summary with a newly computed summary based on the current identifiers (queried by owner and object ID), proposing a patch if they are out of sync.
   - The summary comparison is normalized to avoid false positives caused by array or property ordering (e.g., `activeKinds` array order).
   - The query to compute the summary is strictly bounded to `maxIdentifiersPerObject`. If an object exceeds this bound, the summary computation is skipped and a warning is emitted instead, to avoid proposing an incomplete summary.

## Skipped Records

Records are omitted from candidates and documented in a "skipped" list if:
- They lack required real observation source data.
- The state inference is ambiguous (e.g., `ambiguous-discovery-state` or `ambiguous-created-by`).
- References are inaccessible due to security rules.
- The bounded limit has been reached.

## Output Interpretation

The results shown in the dry run UI are **proposals only**.
- A candidate patch is a suggestion for later review and is *not* applied during Phase 5.
- Stale or ambiguous findings should be manually reviewed by administrators before full execution is permitted in Phase 7.

## Phase 5 Exit Criteria

- A dry-run module exists (`src/lib/observationBackfillDryRun.ts`).
- An admin dry-run UI exists in the AdminPanel.
- No write APIs (`setDoc`, `updateDoc`, `writeBatch`, `runTransaction`, `deleteDoc`) are called in the dry-run path.
- Candidate and skipped samples are correctly grouped and displayed in the UI.
- No imported/synthetic observation generation occurs.
- `npm run lint` and `npm run build` continue to pass.
- Package version is bumped to 1.5.1.