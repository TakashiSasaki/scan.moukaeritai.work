1. *Update `docs/app/database-structure.md` and `docs/architecture/entity-fact-projection-data-model.md`*
   - Add notes that `locations` is a legacy/current implementation term and that `places` is the conceptual target.
   - Clarify `Identifier` and `Binding` terminology.
2. *Review/Update `src/types.ts`*
   - Add comments for `createdAt`, `updatedAt`, `lastSeenAt`, `firstObservedAt`, `lastObservedAt`, `attachedAt`, `detachedAt` as legacy domain time fields. Most are already there, just verify everything aligns.
3. *Run validations*
   - `npm run lint`
   - `npm run test`
   - `npm run build`
4. *Complete pre commit steps*
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
5. *Submit PR*
   - Branch: `maintenance/entity-fact-model-drift-audit`
   - Title: `Audit entity-fact-projection model drift`
