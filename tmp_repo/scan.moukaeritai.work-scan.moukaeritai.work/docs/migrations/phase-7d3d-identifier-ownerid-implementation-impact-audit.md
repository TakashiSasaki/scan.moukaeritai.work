# Phase 7D.3d: Identifier ownerId Implementation Impact Audit

## Scope

This document audits the implementation impact of making `IdentifierRecord.ownerId` optional and non-identifying.

- This phase is documentation / design / audit only.
- No runtime schema changes are made.
- No Firestore rules changes are made.
- No Firebase blueprint changes are made.
- No Cloud Functions changes are made.
- No Firestore writes or migrations are executed.
- Phase 7E remains blocked.

## Decisions already made

- Identifiers are conceptually ownerless/global entities.
- `ownerId` is not part of identifier identity.
- `ownerId` will become optional in a future explicit schema phase.
- `objectId` is not part of identifier identity.
- `legacyItemId` is not part of identifier identity.
- `identifierKey` is UUIDv5 over JCS semantic identity payload.
- `ownerId` may remain in existing data for compatibility but must not define identifier identity.
- Owner-specific state must be represented by objects, observations, bindings, claims, visibility/access-control records, or provenance.

## Current runtime state

- **Current `IdentifierRecord.ownerId` type status**: Required (`ownerId: string;` in `src/types.ts`).
- **Current `IdentifierRecord.objectId` type status**: Optional (`objectId?: string;` in `src/types.ts`).
- **Current `IdentifierRecord.identifierKey` invariant**: The document ID must match `identifierKey`. However, the current rules do not yet enforce the strict JCS UUIDv5 payload schema conceptually decided.
- **Current Firestore rules assumptions for "identifiers"**: `identifiers` rules (line 103+) require `ownerId` during write (`incoming().keys().hasOnly([... 'ownerId' ...])` and `incoming().ownerId == request.auth.uid`) and enforce owner-scoped read (`allow get: if isSignedIn() && (existing() == null || existing().ownerId == request.auth.uid)`).
- **Current blueprint assumptions for "identifiers"**: `firebase-blueprint.json` lists `ownerId` as a required string field in `IdentifierRecord`.
- **Current query assumptions around "ownerId"**: Queries universally rely on `where('ownerId', '==', uid)` to load the user's identifiers, effectively treating identifiers as "my identifiers" instead of "global identifiers".
- **Current UI assumptions, if any, around owner-scoped identifiers**: The UI conceptually views identifiers as scoped by the owner. It fetches them based on `ownerId` and assumes any fetched identifier belongs strictly to the user. Global lookup by ID is currently implicitly blocked by security rules and frontend queries filter out unowned identifiers.

## Usage audit table

| Area | File | Pattern / symbol | Current assumption | Impact of optional non-identifying ownerId | Required future change | Risk |
|---|---|---|---|---|---|---|
| **Frontend UI / Components** | `src/components/CaptureForm.tsx`, `Overview.tsx`, `Dashboard.tsx`, `SearchScreen.tsx` | `where('ownerId', '==', auth.currentUser.uid)` on `identifiers` collection | UI assumes it can list all identifiers "owned" by the user by querying `ownerId`. | High. If identifiers are global and lack `ownerId`, UI queries will fail to find them. UI must fetch user's bindings or observations instead of directly querying `identifiers` by `ownerId`. | Refactor UI to list user identifiers via `objectIdentifierBindings` or `identifierObservations` or update `identifiers` queries to query by specific known `identifierKey`s. | Blocking |
| **Frontend UI / Components** | `src/components/UnassignedIdentifierScreen.tsx` | Assigning/Attaching unknown tag flow | Assumes the written identifier will have `ownerId` set to `currentUser.uid`. | Low/Medium. Writing an identifier without an `ownerId` would break current rules. | The creation flow should either set it (if legacy) or omit it based on a new implementation path (like `identityScope` or a global collection). | Medium |
| **Frontend Hooks/Helpers** | `src/lib/identifierBindings.ts`, `identifierObservations.ts`, `observationDiagnostics.ts` | `ownerId` parameter and `where('ownerId', ...)` | Helper functions scope all `identifiers` queries by `ownerId`. Observation helpers set `firstObservedBy` based on `ownerId`. | High. Helpers will need to resolve identifiers globally by `identifierKey` and check observations/bindings for owner context. | Modify helpers to retrieve identifiers by key or drop `ownerId` filters when fetching global identifiers. Update observation scope logic. | Blocking |
| **Migration Scripts (Dry-run)** | `src/lib/observationBackfillDryRun.ts`, `importedObservationDryRun.ts` | `where('ownerId', '==', ownerId)` on `identifiers` | Dry-runs assume existing records have `ownerId` to scope the backfill. | Low for dry-run since existing records have `ownerId`. | Ensure dry-runs can handle processing future records missing `ownerId` if run continuously. | Low |
| **Functions / Admin SDK** | `functions/src/scanExecuteImportedObservationBatch.ts`, `phase7dControlledDryRun.ts`, `phase7d1LegacyItemsFieldAudit.ts` | `.where("ownerId", "==", ownerId)` and `identifierData?.ownerId !== ownerId` | Backend scripts rigorously check that the identifier belongs to the requested owner. | High. Execution scripts will block processing if they encounter a global identifier without an `ownerId`, or if it doesn't match. | Re-evaluate ownership check for global identifiers. Ensure bindings provide the authorization context. | Blocking |
| **Firestore Rules** | `firestore.rules` | `isOwner(existing().ownerId)`, `incoming().ownerId == existing().ownerId` | Write/read of `identifiers` strictly requires matching `ownerId`. | High. Rules will reject documents missing `ownerId`. Global identifiers would be unreadable by non-owners under current rules. | Introduce new rule categories for reading global identifiers and restricted write paths. | Blocking |
| **Firebase Blueprint** | `firebase-blueprint.json` | `"ownerId"` listed in keys | Blueprint asserts `ownerId` is present. | Low. It's declarative, but mismatch indicates schema drift. | Update blueprint when schema changes. | Low |
| **TypeScript Types** | `src/types.ts` | `ownerId: string;` | `IdentifierRecord` requires `ownerId`. | High. Compiler will flag missing `ownerId`. | Make `ownerId` optional, potentially introducing a discriminator or schema version. | High |
| **Summary & Staleness logic** | `src/lib/observationBackfillDryRun.ts`, `observationDiagnostics.ts`, `CaptureForm.tsx` | `identifierSummary` checks on object | Assumes local identifier fetches by `ownerId` provide all necessary active context for the object. | Medium. If an object is bound to a global identifier, the UI must still fetch it to compute the summary. | Ensure `computeIdentifierSummary` works with global identifiers fetched via bindings. | Medium |

## Firestore rules impact

- **Whether identifier read/write rules require "ownerId"**: Yes. `firestore.rules` enforces `allow get: if isSignedIn() && (existing() == null || existing().ownerId == request.auth.uid);` and write rules mandate `incoming().ownerId == request.auth.uid`.
- **Whether rules use `resource.data.ownerId == request.auth.uid`**: Yes, used in list operations (`allow list: if isSignedIn() && resource.data.ownerId == request.auth.uid;`).
- **Whether rules use `request.resource.data.ownerId == request.auth.uid`**: Yes, via the custom validation blocks (`incoming().ownerId == request.auth.uid`).
- **Whether global ownerless identifiers could be read safely under current rules**: No. Read operations would be denied for any user who is not the `ownerId` on the document, and would completely fail for documents lacking an `ownerId`.
- **Whether global ownerless identifiers could be written safely under current rules**: No. Writes without `ownerId` would be rejected by schema validation blocks.
- **What future rule categories are needed**:
  - signed-in read of global identifier registry (allowing users to look up known tags).
  - restricted write path for global identifiers (e.g., claiming/creating an unknown tag safely).
  - owner/user-scoped observations (rules verifying `identifierObservations` restrict `ownerId` to the observer).
  - owner/user-scoped bindings or claims (verifying `objectIdentifierBindings` safely references global identifiers).
  - admin/backend-only migration writes.
  - raw/canonical identifier value exposure policy (preventing enumeration or scraping).

## Query and index impact

- **Which queries will break if "ownerId" is optional**: All UI and helper queries using `query(collection(db, 'identifiers'), where('ownerId', '==', uid))` will fail to list any new global identifiers.
- **Which queries are intentionally owner-scoped and should move to observations/bindings/claims**: List views like Dashboard or "My Tags" lists should query `objectIdentifierBindings` or `identifierObservations` to find what tags the user has interacted with or bound to their objects.
- **Which queries should become global identifier lookup by "identifierKey"**: Lookups during scanning (e.g. `UnassignedIdentifierScreen`, `CaptureForm`'s `attach` workflow, validation logic) should fetch `doc(db, 'identifiers', identifierKey)` directly instead of querying by `ownerId`.
- **Whether any compound index expectations may change**: Compound indexes involving `ownerId` on the `identifiers` collection may become obsolete or require updating if queries shift away from it.
- **Whether UI flows assume “my identifiers” rather than “global identifiers related to my objects”**: The UI currently heavily assumes "my identifiers". Changing this conceptually means updating how users view the tag registry (e.g. they don't "own" a tag, they "bind" it).

## TypeScript schema impact

Current future direction:
`ownerId?: string;`

If `ownerId` becomes optional, a companion discriminator or structured approach is needed to differentiate legacy owner-scoped records from new global records without breaking runtime expectations silently.

Options:
1. **no discriminator, only `ownerId?: string`**: Simple, but risky. It's hard to tell if a record is intentionally global or malformed/legacy.
2. **`identityScope?: 'global' | 'legacy_owner_scoped'`**: Clear discriminator. Allows runtime checks and rules to branch logic explicitly.
3. **`identityModelVersion?: number`**: Useful for broader schema versioning, but less explicit about the scope change itself.
4. **separate `registeredBy` / `createdBy` fields**: Retains provenance without implying ownership.
5. **separate `identifierClaims` collection**: Moves ownership out of the identifier, keeping identifiers strictly global.
6. **separate `globalIdentifiers` collection**: Cleanest break, avoids touching legacy data entirely during transition, but adds complexity in syncing/querying both.

**Recommended future implementation approach**:
Option 2 (`identityScope?: 'global' | 'legacy_owner_scoped'`) combined with `ownerId?: string`. This provides explicit intent for both rules and frontend logic to branch on. Existing records implicitly or explicitly become `legacy_owner_scoped`, while new ownerless records are explicitly `global`. This approach accommodates existing records with required `ownerId`, allows new ownerless/global records without `ownerId`, avoids silent malformed records, and provides clear compatibility paths for Firestore rules and the current UI.

## objectId impact

- **`objectId` is already optional**: It exists on `IdentifierRecord` but is not required.
- **`objectId` is not part of identifier identity**: It describes a binding, not the tag itself.
- **canonical relationships should live in `objectIdentifierBindings` or future `identifierTargetBindings`**: Direct dependence on `IdentifierRecord.objectId` is an anti-pattern under the new model.
- **any direct `IdentifierRecord.objectId` use should be treated as compatibility / denormalized convenience unless explicitly justified**.
- **Affected files**: `src/components/CaptureForm.tsx` (reads `identifier.objectId`), `src/components/UnassignedIdentifierScreen.tsx`, and helpers checking `identifier.objectId` directly.

## Migration and data compatibility impact

- existing records may have `ownerId`
- future records may omit `ownerId`
- no destructive rewrite should be performed
- existing owner-scoped data must remain readable
- source coverage audit is still required before any execution
- old `ownerId` values should not be silently discarded
- migration plans must classify source fields according to the migration completeness rule (e.g. migrated, partially migrated, derived only, preserved as legacy reference, preserved as raw snapshot, intentionally discarded, unmigrated gap, needs decision)

## Access / privacy decisions still needed

- Are global `identifiers` readable by all signed-in users?
- Are `rawValue` and `canonicalValue` visible to all signed-in users?
- Should raw values be redacted, hashed, or rules-protected?
- Who can create a global identifier?
- Who can update `label`, `status`, or metadata?
- Should label be global, per-user claim metadata, or both?
- Can a user bind an identifier first observed by another user?
- How are conflicting claims represented?
- How are spoofed/reused Bluetooth or Wi-Fi identifiers handled?
- What fields remain client-writable vs backend-only?

## Recommended next phases

- **Phase 7D.4 — Ownerless identifier schema proposal**
  - documentation/design only
  - choose exact TypeScript field shape
  - choose Firestore rules strategy
  - choose blueprint changes
  - choose claim/binding model
- **Phase 7D.5 — Additive schema/rules implementation for ownerless identifiers**
  - actual code change phase
  - only after 7D.4 decisions are complete
- **Phase 7D.6 — Bluetooth legacy read-only dry-run implementation**
  - no writes
  - uses new identifier identity model
  - reports proposed identifiers/bindings/legacy metadata
- **Phase 7E-1 / 7E-2**
  - final controlled execution remains separated and requires explicit approval

Note: Phase 7E remains blocked.
