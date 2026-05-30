## Summary

Implement Phase 7D.8 additive identifier runtime schema implementation and unit-test foundation.

## Files Changed

- `src/types.ts`: Added `JsonValue` type and `IdentifierRecord` v2 additive fields (`rawPayload`, `identityModelVersion`, `identitySchemaVersion`, `canonicalizationVersion`). Kept `ownerId` required. Kept `rawValue`.
- `src/lib/identifierIdentity.ts`: Created pure helper for `buildIdentifierSemanticIdentityPayload`.
- `src/lib/identifierIdentity.test.ts`: Added unit tests for pure identity payload helper.
- `firebase-blueprint.json`: Updated additively with `IdentifierRecord` v2 fields.
- `package.json`, `package-lock.json`: Added `vitest` devDependency, added `test` script, bumped version to 1.7.21.
- `docs/migrations/observation-model-migration.md`: Updated phase tracking.
- `docs/app/database-design-decision-matrix.md`: Added Phase 7D.8 row.
- `docs/app/database-structure.md`: Updated `identifiers` structure with new fields.

## Implementation Scope

- **Additive Schema Only:** Implemented the first bounded additive runtime/schema step for the ownerless/global identifier v2 model.
- **Unit Testing:** Added Vitest for pure testing. Added pure test cases verifying `idPurpose`, `ownerId`, `objectId`, etc., are excluded from the canonical identity payload.
- **No Deploy:** Did not run Firebase deploy.
- **No Migrations:** Did not execute any database migrations.
- **No Data Writes:** Did not add any Firestore reads/writes.
- **No Rules Changes:** Firestore rules were not changed. Phase 7E remains blocked.

## Tests and Validation

- `npm run lint` passed.
- `npm run build` passed.
- `npm run test` passed (Vitest, 11 pure tests).
- Confirmed `ownerId` remained required on `IdentifierRecord`.
- Confirmed `rawValue` remains for compatibility.
- Confirmed `rawPayload` was added as non-identifying JSON-compatible payload.
- Confirmed semantic identity helper excludes ephemeral/owner-scoped/mutable fields.
- Verified no scope contamination (no conflict markers, no broad deploy scripts).

## Next Recommended Phase

Phase 7D.9 — Firestore rules transition design / implementation planning.
