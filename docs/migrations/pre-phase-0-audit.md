# Pre-Phase-0 Audit: Observation Model Migration

## Scope
This is a discovery-only audit performed before Phase 0. Its purpose is to locate all existing artifacts, routes, UI components, Cloud Functions, and documentation related to the old `items` to normalized model migration, and to prepare a safe, non-destructive path for the upcoming observation-aware migration. No implementation changes, destructive actions, or database migrations are performed in this step.

## Baseline
The intended baseline for the upcoming observation model migration is `tag-1.0.0`.
**Verification**: The tag `tag-1.0.0` exists in the repository. Essential files like `package.json`, `src/types.ts`, `firebase-blueprint.json`, and `AGENTS.md` were successfully read from this tag to confirm the current schema definitions.

## Current normalized model
The current baseline `tag-1.0.0` data model consists of the following normalized collections:
- `objects`: Physical objects (`objectId` must equal document ID).
- `identifiers`: Lookup values such as QR/NFC/manual (`identifierKey` must equal document ID).
- `objectIdentifierBindings`: Canonical relationship state between an object and an identifier (`bindingId` must equal document ID, formatted as `${objectId}__${identifierKey}__active`). This is **not** a history log.
- `objectEvents`: Append-only operational history/audit log (`eventId` must equal document ID).
- `objectImages`: Normalized image metadata (`imageId` must equal document ID).

**Invariants confirmed by code/docs:**
- `IdentifierRecord.objectId` is optional (unassigned identifiers are already possible).
- ID equivalence to document ID is heavily enforced for all the above collections.

## Completed legacy migration
The previous migration from the legacy `items` collection to the normalized collections (`objects`, `identifiers`, etc.) is considered **completed**. All active development and future migrations should treat the current normalized model as the source of truth, leaving legacy logic only as an archived fallback or to be cleaned up.

## Old migration artifacts

| Path | Symbol / Page / Function | Classification | Recommended Phase 0 action | Notes |
|---|---|---|---|---|
| `src/components/MigrationScreen.tsx` | `MigrationScreen` | Legacy migration artifact | Remove from active navigation | This is the UI for the completed items -> normalized migration. |
| `src/App.tsx` | `/admin/migration` route | Legacy migration artifact | Remove route | Removes access to `MigrationScreen`. |
| `src/lib/routeCatalog.ts` | `/admin/migration` catalog entry | Legacy migration artifact | Remove route | Keeps catalog in sync with router. |
| `functions/src/index.ts` | `migrateInventoryModel` | Legacy migration artifact | Disable export later | Completed migration function. Do not reuse for observation-model. |
| `src/components/Scanner.tsx` | Legacy fallback logic | Still-needed normalized-model support | Leave unchanged | Needed for backward compatibility with old physical tags. |
| `src/components/CaptureForm.tsx` | Legacy duplicate detaching / warnings | Still-needed normalized-model support | Leave unchanged | Maintains integrity when encountering old records. |
| `src/components/UnassignedIdentifierScreen.tsx` | Legacy duplicate detaching | Still-needed normalized-model support | Leave unchanged | Same as CaptureForm. |
| `src/types.ts` | `legacy` properties / `LegacyItem` | Still-needed normalized-model support | Leave unchanged | Required for type safety of legacy fallbacks. |

### Details: `functions/src/index.ts` / `migrateInventoryModel`
This function explicitly targets the legacy `items` collection to migrate records to `objects`. It must not be extended for the new observation-model migration. In Phase 0 or later, it should be marked as archive/legacy or the export should be disabled to prevent confusion.

## Current documentation gaps
Review of `AGENTS.md` and `firebase-blueprint.json` reveals the following gaps:
- The distinction between the *completed* legacy `items` migration and any *upcoming* migrations is not explicitly stated.
- The observation-aware model migration is not mentioned at all yet.
- The policy of "non-destructive additive migration" for future updates is missing from the core guidelines.

## Current navigation/routing findings
The old migration UI is fully exposed via the `/admin/migration` route in `App.tsx` and documented in `src/lib/routeCatalog.ts`.

## Cloud Functions findings
The function `migrateInventoryModel` is currently exported in `functions/src/index.ts` and callable from the client. It handles the old legacy logic.

## Merge-conflict damage check
A repository-wide search for standard merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) was performed.
**Result:** No merge conflicts or duplicated structural damage were found.

## Recommended Phase 0 actions
1. Create `docs/migrations/observation-model-migration.md`.
2. State clearly in docs that `tag-1.0.0` is the completed normalized baseline.
3. State that the previous legacy `items` migration is completed.
4. State that future migration work targets `tag-1.0.0` or later.
5. Define the upcoming migration as strictly non-destructive and additive.
6. List all phases and goals for the observation-model migration.
7. Specify global invariants and forbidden actions.
8. Update `AGENTS.md` with a short migration-status section pointing to the new migration plan.
9. Remove the old migration UI (`/admin/migration`) from active navigation/routing.
10. Mark old migration tooling (e.g., `migrateInventoryModel`) as legacy/archive, not active.

## Do-not-do list for Phase 0
- **Do not** add `identifierObservations` yet.
- **Do not** alter Firestore rules yet.
- **Do not** write any backfill or database migration function yet.
- **Do not** delete existing production data.
- **Do not** reinterpret `ownerId` destructively.
- **Do not** merge old migration concepts with the new observation migration concepts.
