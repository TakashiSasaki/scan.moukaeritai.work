1. **Update `src/types.ts`:**
   - Add `primaryImageUrl?: string;` to `ObjectRecord`.
   - Add `rawValue?: string;` and `label?: string;` to `IdentifierRecord` (already present, verify).
   - Add `lastSeenAt?: Timestamp;` to `IdentifierRecord` (already present, verify).
2. **Update `firestore.rules`:**
   - Tighten `objects/{objectId}`: Add exact value checks, add `primaryImageUrl` to allowlist, validate `currentLocation` (`latitude`, `longitude` bounds, `address` length), validate `identifierSummary`.
   - Tighten `identifiers/{identifierKey}`: Add exact value checks, restrict string lengths, allow `objectId` omission only for specific statuses, restrict update allowlist.
   - Tighten `objectIdentifierBindings/{bindingId}`: Validate exact ID match, enforce timestamps, restrict update allowlist.
   - Tighten `objectEvents/{eventId}`: Restrict creation to current user, require exact event ID, restrict updates/deletes to admin.
   - Tighten `objectImages/{imageId}`: Ensure `objectId` presence, add string length checks for paths/URLs.
3. **Update `functions/src/index.ts` (Migration logic):**
   - Refactor `migrateInventoryModel` to process per target record idempotently, regardless of `objects/{objectId}` existence.
   - Normalize `objectId` (uppercase) to ensure consistency.
   - Create `objectIdentifierBindings` records during migration.
   - Add `primaryImageUrl` to the created `objects`.
   - Record errors but continue migration for other items.
   - Update return stats with `bindingsCreated`.
4. **Create `src/lib/objectSummaries.ts`:**
   - Add `computeIdentifierSummary` and `normalizeObjectId` utility functions.
5. **Update `src/lib/identifiers.ts`:**
   - Ensure ID normalizations use the new shared `normalizeObjectId`.
6. **Update `src/components/Dashboard.tsx` & `src/components/SearchScreen.tsx`:**
   - Use `objects.primaryImageUrl` for displaying images instead of placeholders.
7. **Update `src/components/CaptureForm.tsx`:**
   - Add identifier management (show active identifiers grouped by kind, "Add Identifier" flow, detach/retire action).
8. **Update `src/components/UnassignedIdentifierScreen.tsx`:**
   - Add "Attach to Existing Object" flow using a selector.
9. **Update `src/components/MigrationScreen.tsx`:**
   - Update stats display to include `bindingsCreated`.
10. **Update Documentation & Configurations:**
    - Update `AGENTS.md` to reflect new model, removing legacy statements.
    - Update `firebase-blueprint.json` to include `primaryImageUrl` and the complete state of `IdentifierRecord`, `Binding`, `Event`, `Image`.
    - Update `src/lib/routeCatalog.ts` if new routes were created.
11. **Run Verifications:**
    - Call `pre_commit_instructions` and follow them to verify lint, build, etc.
12. **Submit changes:**
    - Commit and submit changes with appropriate messages.
