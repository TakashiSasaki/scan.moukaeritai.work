# Phase 7D.9: Firestore Rules Transition Design

## Scope and non-goals

This phase is **design/readiness only**. It provides a roadmap for how Firestore security rules can eventually transition toward the observation-aware and v2 identifier model (ownerless identifiers).

- **No rules modifications:** This phase does not modify `firestore.rules`.
- **No execution:** It does not execute migrations.
- **No new observation types:** It does not create imported or synthetic observations.
- **No UI changes:** It does not add AdminPanel or web execute/apply/repair controls.
- **Phase 7E is blocked:** Final execution and rollout of imported observations or wide-scale schema updates remain blocked until Phase 7E.

## Current rules baseline

The current `firestore.rules` (baseline from 1.7.x) has the following security posture:

- **Global Safety Net:** All reads and writes are denied by default.
- **Authentication:** All client access requires authentication (`isSignedIn()`).
- **Owner Isolation:** Almost all collections (`objects`, `identifiers`, `objectIdentifierBindings`, `objectEvents`, `objectImages`, `items`) enforce strict isolation via `isOwner(existing().ownerId)` for reads and `incoming().ownerId == request.auth.uid` for creates.
- **Admin Access:** Clients satisfying `isAdmin()` have global read/list/delete access on `items`, global read/delete access on `identifierObservations`, and update/delete access on `objectEvents` (but notably *not* global read access on `objectEvents` or `objectImages`). Clients satisfying `isAdmin()` can write the `admins` collection and modify the `role` field when a user updates their own profile. (Note: This is distinct from Backend/Admin SDK access, which bypasses rules entirely).
- **Observations:** `identifierObservations` allows creation by any authenticated user provided it's a valid sighting/scan record. Updates are strictly disabled (`allow update: if false`). Reads are allowed for the `ownerId` or `observerUid`, and clients satisfying `isAdmin()`.
- **Users:** Signed-in users can `get` known user profile documents, while profile updates are strictly scoped to the authenticated user's own document (`request.auth.uid == userId`). Arbitrary user listing (`list`) is not permitted. Modifying the `role` field during that self-update requires `isAdmin()`.
- **Admins:** A user can read their own admin document. Clients satisfying `isAdmin()` can read and write the `admins` collection.

**Rules depending on specific fields:**
- `ownerId`: Used heavily in `isOwner()` checks across `objects`, `identifiers`, `objectIdentifierBindings`, `objectEvents`, `objectImages`, `identifierObservations`, and `items`.
- `objectId`: Enforced to be a string and matched with the document ID in `objects` and `objectImages`. It's optional in `objectEvents`.
- `identifierKey`: Enforced to be a string and matched with document ID in `identifiers`. Verified in `identifierObservations` and `objectIdentifierBindings`.
- Binding ownership: Inherits `ownerId` logic.
- Object ownership: Inherits `ownerId` logic.

## Runtime write path inventory

Runtime client write paths in the React application (primarily `src/lib/` and `src/components/`):

- **`objects`**:
  - client-created: Yes (`CaptureForm.tsx` using `writeBatch`).
  - client-updated: Yes (`CaptureForm.tsx` using `updateDoc` or `writeBatch`).
- **`identifiers`**:
  - client-created: Yes (`UnassignedIdentifierScreen.tsx`, `identifierObservations.ts` via `runTransaction`).
  - client-updated: Yes (via `runTransaction` for observation updates).
- **`objectIdentifierBindings`**:
  - client-created: Yes (`CaptureForm.tsx`, `UnassignedIdentifierScreen.tsx`).
  - client-updated: Yes (`CaptureForm.tsx` via `writeBatch` for detached status).
- **`identifierObservations`**:
  - client-created: Yes (`Scanner.tsx`, `identifierObservations.ts` via `runTransaction`).
  - client-updated: No (rules explicitly deny `allow update: if false;`).
- **`objectEvents`**:
  - client-created: Yes (`Scanner.tsx`, `CaptureForm.tsx`, `UnassignedIdentifierScreen.tsx`).
  - client-updated: permitted for signed-in clients satisfying `isAdmin()` according to rules, but practically intended for backend/Admin SDK paths (which bypass rules entirely). Ordinary owner clients cannot update events.
- **`objectImages`**:
  - client-created: Yes (`CaptureForm.tsx` using `setDoc`).
  - client-updated: No (the rules permit updates, but the React client currently only queries the collection and creates new documents).
- **`users`**:
  - client-updated: Yes (`useUserSettings.ts`, `App.tsx` on login).
- **`admins`**:
  - client-read: Yes (users can read their own admin document; clients satisfying `isAdmin()` can read all).
  - client-updated: permitted for signed-in clients satisfying `isAdmin()` according to rules, but practically intended for backend/Admin SDK paths (which bypass rules entirely).

## Source coverage / source-to-target audit

Based on the migration completeness rule, the following fields are audited for their rules-relevance and transition state:

- `ownerId`: **partially-migrated** (Present across the board, but transitioning to optional/non-identifying for `identifiers` in the v2 model).
- `objectId`: **partially-migrated** (Used in `IdentifierRecord` as legacy/non-authoritative compatibility only; canonical relation is moving to `objectIdentifierBindings`).
- `identifierKey`: **migrated** (UUIDv5 canonical implementation in place).
- `bindingId`: **migrated**.
- `identifierSummary`: **derived-only**.
- `rawValue`: **preserved-as-legacy-reference** (Preserved for legacy/runtime compatibility and must not be silently dropped. Replaced conceptually in future designs by `rawPayload` or specific schema fields, but remains present in rules and data. `rawPayload` is the preferred additive v2 field).
- `rawPayload`: **migrated** (Introduced as optional JSON in additive runtime schema; not yet allowed in `firestore.rules`).
- `identityModelVersion`: **migrated** (Introduced as 1 | 2 in runtime schema; not yet allowed in `firestore.rules`).
- `identitySchemaVersion`: **migrated** (Introduced in runtime schema; not yet allowed in `firestore.rules`).
- `canonicalizationVersion`: **migrated** (Introduced in runtime schema; not yet allowed in `firestore.rules`).
- observation author/source fields (e.g., `observerUid`, `source`): **migrated** (Rules enforce specific sources like 'qr', 'nfc', 'manual', 'camera').
- imported/synthetic observation markers: **needs-decision** (Not yet allowed by client rules; requires backend execution or future Admin SDK rules).

*Note: Since imported/synthetic observation markers remain `needs-decision` for client rules, production transition is blocked until resolved or handled exclusively via backend/Admin SDK.*

## Proposed transition strategy

To safely transition to the ownerless identifier model and support imported observations, the following staged, conservative plan is proposed:

1. **Preserve Current Behavior:** Maintain all existing `ownerId` isolation for `objects`, `bindings`, `events`, and `images`.
2. **Backend/Admin SDK First:** Do not broaden ordinary client writes to imported observations. Keep imported observation generation and execution purely in the backend/Admin SDK (e.g., via Phase 7E GitHub Actions workflows).
3. **Privileged Fields:** Clients must not be allowed to write privileged migration/import fields (e.g., synthetic timestamps, `observationType: "imported"`). Rules should explicitly reject these from `incoming()`.
4. **Staged Rules Updates:**
   - *Stage 1:* Additive fields (`rawPayload`, `identityModelVersion`) are designed to be allowed in rules (completed in 7D.8 planning, pending actual `firestore.rules` deployment). Currently, they are not allowed in incoming writes by client rules.
   - *Stage 2:* Implement rules for ownerless identifiers (allowing `ownerId` to be omitted or null for specific identifier creations) but only when created via backend or when specific claims are met.
   - *Stage 3:* Roll out generic target bindings if needed.
5. **Rollback Considerations:** Since rules are declarative, any breakage can be rolled back by reverting the `firestore.rules` file to the previous commit. Ensure no destructive data migrations accompany rule deployments initially.

## Firestore rules design implications

- **New Helper Functions:** Future rules will need helpers to handle ownerless/global identifiers. For example, checking if an identifier is global, or verifying `identifierClaims` when introduced.
- **Unchanged Predicates:** `isValidId()`, `isOwner()`, and `isAdmin()` should remain unchanged. The core isolation for objects and events must persist.
- **Risks of Ownerless Identifiers:** Allowing clients to create global identifiers without an `ownerId` risks a denial-of-service (DoS) via namespace collision if clients can easily guess and claim UUIDv5 keys. Creation of ownerless identifiers might need to be restricted to backend processes or require accompanying proof-of-possession.
- **Legacy `IdentifierRecord.objectId`:** This field is legacy and non-authoritative. The canonical relationship is now managed via `objectIdentifierBindings`. Rules may eventually need to stop requiring `objectId` in `identifiers` or treat it purely as informational.
- **Future Fields:** `identifierClaims`, `globalIdentifiers`, and ACL fields (`visibility`, `readers`, `writers`, etc.) are future-only and must not be introduced in this phase or current rule iterations.

## Emulator test plan

A future emulator test matrix should verify the transition without affecting production data. If no current emulator setup exists, use `firebase emulators:exec` with a standard Mocha/Jest suite.

Test matrix must include:
- **Authenticated owner:** Can read/write their own objects, bindings, events, and standard observations.
- **Non-owner denial:** Cannot read or modify records belonging to other `ownerId`s.
- **Admin-only behavior:** Admins can read all, update/delete `objectEvents`, read/delete `identifierObservations` (but `identifierObservations` update remains denied), and modify users/admins.
- **Identifier lookup:** Global/ownerless identifiers can be read if binding/claims allow (future state).
- **Observation creation:** Valid 'qr'/'nfc' sightings are accepted; invalid schemas rejected.
- **Imported rejection:** Rejection of `observationType: "imported"` or synthetic timestamps by ordinary clients.
- **Migration controls:** Rejection of migration/repair/execute writes from non-admins.
- **Legacy compatibility:** Ensure old records without new additive fields are still readable and updatable safely (e.g., using `existing().get('fieldName', null)`).

## Blocking decisions before implementation

- **Safe to implement now:** Additive fields (e.g., allowing `rawPayload` in incoming data).
- **Safe only as emulator tests:** Ownerless identifier creation logic.
- **Requires user decision:** How client apps should react when querying an ownerless identifier (UI/UX changes).
- **Blocked until Phase 7E or later:** Actual deployment of broadened rules for imported observations, `identifierClaims`, or ACL structures.

## Validation performed

- PR validation reported `npm ci`, `npm run lint`, `npm run build`, and `npm run test`; the Phase 7D.9 document itself is documentation-only and records no runtime or rules changes.
