# Phase 1: Observation Model Specification

## Scope

This is a specification-only phase. Phase 1 decides field names, semantics, invariants, and future implementation boundaries for the observation model. Implementation belongs to later phases. No schema, code, UI, or Firestore rule changes are made in this phase.

## Relationship to tag-1.0.0

- `tag-1.0.0` is the immutable migration source baseline.
- The current working branch may include preparation/governance commits after `tag-1.0.0`.
- Existing baseline collections remain valid.
- The migration is additive and non-destructive.
- Phase 1 starts the `1.1.x` version line.

## Existing baseline collections

Existing collections and their responsibilities:

- `objects`: canonical state of real-world objects
- `identifiers`: lookup table for QR/NFC/manual/barcode/bluetooth identifiers
- `objectIdentifierBindings`: canonical relationship state between objects and identifiers
- `objectEvents`: object operational history/audit log
- `objectImages`: normalized object image metadata

Note: `objectIdentifierBindings` is not history, and `objectEvents` should not be used as a generic object-independent observation log.

## New collection: identifierObservations

Future collection: `identifierObservations/{observationId}`

Purpose:
- Store object-independent observations of identifiers.
- Allow NFC/QR/manual/barcode/BLE observations even when no object is registered yet.
- Support human reports and future sensor/device observations.
- Record “someone last reported this” rather than formal custody/loan state.

Constraints:
- `objectId` must be optional.
- Observations are evidence/log records, not canonical object state.

## IdentifierObservationRecord draft

*Draft record shape in documentation only.*

- **`observationId: string`**
  - Required. Must equal document ID.
  - Normal client-created observations should use UUIDv7.
  - Imported/synthetic observations should use deterministic IDs for idempotency.
  - Normal observations should not use Firestore auto IDs.
  - Normal observations should not use UUIDv4 unless UUIDv7 is unavailable and explicitly justified later.
  - Sorting and queries must use `observedAt` or `receivedAt`, not `observationId` ordering.
  - UUIDv7 exposes approximate generation time; this is acceptable because observation records already carry timestamps, but observation IDs must not be treated as private secrets.
  - If high-volume device ingestion becomes necessary, revisit Firestore write distribution and hotspot risk.

- **`identifierKey: string`**
  - Required. Refers to `identifiers/{identifierKey}`.
  - The identifier document may or may not already exist at observation time; Phase 2/3 should decide exact create behavior.

- **`objectId?: string`**
  - Optional. Present only when the observation can be associated with an object at creation time or after later reconciliation.
  - Absence is valid and expected for unknown tag observations.

- **`observerKind: "user" | "device" | "system"`**
  - Required.
  - `user`: authenticated or anonymous Firebase Auth user.
  - `device`: future registered sensor/gateway/reader device.
  - `system`: migration/import/backend-generated observation.

- **`observerUid?: string`**
  - Required when `observerKind == "user"`.
  - Must match `request.auth.uid` in future client-created observations.
  - May be an anonymous Firebase Auth UID.

- **`observerIsAnonymous?: boolean`**
  - Optional snapshot for display/rules diagnostics.
  - True when the reporter used Firebase anonymous authentication.

- **`observerDeviceId?: string`**
  - Required when `observerKind == "device"` in future device-ingest flows.
  - *Note: Phase 1 explicitly states that client-side device observations are not enabled yet.*

- **`observedAt: Timestamp`**
  - Required. Time when the observation happened.
  - For normal client scan/report this will usually be near `request.time`.

- **`receivedAt: Timestamp`**
  - Required. Time when the backend/client accepted or wrote the observation.
  - Important for delayed sensor uploads/imports.
  - In client-created Phase 3 behavior, this may initially equal request time.

- **`source: "nfc" | "qr" | "manual" | "barcode" | "ble" | "camera" | "gateway" | "import"`**
  - Required. Physical/logical source channel.

- **`observationType: "sighting" | "scan" | "proximity" | "gateway_seen" | "imported"`**
  - Required.
  - `sighting`: human says it was seen/found at some place.
  - `scan`: explicit scan, possibly without a location report.
  - `proximity`: sensor/BLE proximity evidence.
  - `gateway_seen`: fixed reader/gateway saw it.
  - `imported`: synthetic record derived from existing data or migration.

- **`placeLabel?: string`**
  - Optional. Human-readable place, e.g. "living room shelf".
  - Useful when exact GPS is unavailable or undesirable.

- **`location?: { latitude: number; longitude: number; address?: string }`**
  - Optional. Should be treated as reported/observed location, not necessarily confirmed canonical location.

- **`note?: string`**
  - Optional short user note. Avoid designing this as a formal custody/loan field.

- **`metadata?: Record<string, unknown>`**
  - Optional escape hatch for source-specific data such as RSSI, reader ID, scan window, imported-from marker, etc.
  - The spec recommends promoting frequently used metadata to typed fields later, but not in Phase 1.

- **`visibility?: "private" | "linked_object" | "community" | "public"`**
  - Optional draft field.
  - Needs discussion whether to include in Phase 2 or defer. Initial implementation may keep visibility conservative.

- **`createdAt: Timestamp`**
  - Required. Document creation time.

- **`schemaVersion?: number`**
  - Optional. Consider setting to `1` for future observation records.

## Observation semantics

- Observations are append-only or append-mostly evidence records.
- Observations do not prove ownership.
- Observations do not prove custody.
- Observations do not automatically mean an object is located there.
- Observations may be used to update denormalized summaries in later phases.
- Observations may exist without an object.
- Observations may later be linked to an object.
- A user observation records “this user reported/scanned/saw this identifier”, not “this user borrowed it”.

## Existing collection field additions

*Draft optional fields. Documentation-only in Phase 1.*

### identifiers additions

Draft optional fields:
- `firstObservedAt?: Timestamp`
- `firstObservedBy?: string`
- `firstObservationId?: string`
- `lastObservedAt?: Timestamp`
- `lastObservedBy?: string`
- `lastObservationId?: string`
- `lastObservedSource?: string`
- `discoveryState?: "observed" | "registered" | "detached" | "unknown"`
- `schemaVersion?: number`

Semantics:
- `status` should not gain `"observed"` in the initial plan unless explicitly justified.
- Keep existing `status: "unassigned"` for identifiers not attached to an object.
- Use `discoveryState` to distinguish why/how an unassigned identifier is known.
- `lastObservedBy` means last reporter/observer, not holder/borrower.

### objects additions

Draft optional fields:
- `createdBy?: string`
- `ownerUid?: string`
- `visibility?: "private" | "link_shared" | "community_visible" | "public_readable"`
- `status?: existing statuses plus "provisional"` (discuss whether `provisional` should be added)
- `lastObservationSummary?: { ... }`
- `lastReportedAt?: Timestamp`
- `lastReportedBy?: string`
- `lastReportedLocation?: { latitude: number; longitude: number; address?: string }`
- `lastReportedPlaceLabel?: string`

Semantics:
- These are optional and must not break old object documents.
- `lastReportedBy` means the last person who reported an observation, not current custodian.
- Do not add `currentCustodianUid` in the initial plan unless explicitly justified.
- Do not add formal loan/borrow state.

### objectEvents

Clarify:
- `objectEvents` remains object operational history/audit log.
- Do not use `objectEvents` as the primary object-independent observation log.
- Object creation, edits, image changes, identifier attach/detach remain in `objectEvents`.
- Scan/sighting/proximity records should go to `identifierObservations` once implemented.

### objectIdentifierBindings

Clarify:
- No structural change planned in Phase 1.
- It remains canonical relationship state.
- Observation records must not replace bindings.
- A tag can be observed before it is bound to an object.

### objectImages

Clarify:
- No immediate structural change planned.
- Observation-attached images are out of scope for initial implementation.
- If observation photos are needed later, evaluate either `observationImages` or generalized image records in a later phase.
- Do not change `objectImages.objectId` semantics in Phase 1.

## Anonymous Firebase Auth reporting

Future intended behavior:
- Casual reporters may use Firebase Anonymous Authentication.
- Unauthenticated writes should not be allowed.
- Anonymous users can create user observations as `observerKind: "user"`.
- `observerUid` should be the Firebase Auth UID, including anonymous UID.
- Later account linking can preserve anonymous UID-owned data if the user upgrades the account.
- UI should present anonymous observers carefully, e.g. “anonymous reporter”, not as verified owners.
- *Note: Do not implement this in Phase 1.*

## Device/sensor observations

Future intended behavior:
- `observerKind: "device"` is reserved for registered sensor/gateway/reader devices.
- Client-side arbitrary device observation writes must not be allowed initially.
- Device observations should eventually be ingested through Cloud Functions or another authenticated backend/device-auth mechanism.
- Metadata may include RSSI, readerId, antennaId, scanWindowMs, confidence, etc.
- *Note: Phase 1 only specifies fields; it does not implement device ingestion.*

## Denormalized summaries

Future summary behavior:
- `identifiers` may store first/last observation summary fields.
- `objects` may store `lastObservationSummary` or `lastReported...` fields.
- These are denormalized caches.
- Source of truth is `identifierObservations`.
- Existing `objects.identifierSummary` remains about active identifiers, not observations.
- Updating summaries belongs to later implementation phases.

## Migration/backfill implications

Specify:
- Existing data must remain valid without observation fields.
- Backfill should be optional and dry-run first in later phases.
- Existing identifiers may receive observation summary fields later.
- Imported observation records, if created, must use `observationType: "imported"`.
- Imported observations must not be represented as human sightings.
- Creating imported observations should be opt-in, not automatic.

## Decisions before Phase 2

Record these decisions:

1. **Identifier existence at observation creation**
   - **Decision:** Observation creation must reference an `identifierKey`, but it does not require a pre-existing object. `objectId` remains optional. For implementation, `identifiers/{identifierKey}` should exist by the time the observation is written: if it already exists, reuse it; if the identifier is unknown, Phase 3 should create `identifiers/{identifierKey}` and `identifierObservations/{observationId}` together, preferably in one batch/transaction. The new identifier should initially use `status: "unassigned"` and `discoveryState: "observed"` once those fields are implemented. Observation creation must not require creating an object, but it also must not leave an observation pointing at a missing `identifiers/{identifierKey}` document.

2. **observationId generation**
   - **Decision:** Normal client-created `identifierObservations` should use UUIDv7 for `observationId`. Imported/synthetic observations should use deterministic IDs for idempotency. Normal observations should not use Firestore auto IDs. Normal observations should not use UUIDv4 unless UUIDv7 is unavailable and explicitly justified later.
   - **Rationale:** Observations are log-like records. UUIDv7 carries a timestamp prefix and is useful for debugging, export, and approximate chronological locality. Formal sorting and queries must not rely on `observationId` order. Use `observedAt` or `receivedAt` for ordering. UUIDv7 exposes approximate generation time; this is acceptable because observation records already carry timestamps, but observation IDs must not be treated as private secrets. If high-volume device ingestion becomes necessary, revisit Firestore write distribution and hotspot risk.
   - **Implementation note for later phases:** Check whether the existing `uuid` package supports v7. If supported, future implementation may use: `import { v7 as uuidv7 } from 'uuid';`. Do not implement this import in this task.

3. **visibility**
   - **Decision:** Include `visibility` as an optional draft field in the Phase 2 types/spec. Initial implementation should remain conservative. Default should be "private" unless a later phase explicitly implements sharing semantics. Do not open community/public reads merely because the field exists. Firestore rules in Phase 2 should not grant broad public/community access unless explicitly designed.
   - **Suggested future union:** For `identifierObservations`: `"private" | "linked_object" | "community" | "public"`. For objects: `"private" | "link_shared" | "community_visible" | "public_readable"`. If this naming mismatch is considered undesirable, record it as a naming issue to resolve before Phase 2 implementation.

4. **provisional objects**
   - **Decision:** Do not add `"provisional"` to `objects.status` in Phase 2. Provisional object support should wait until the UI/workflow for creating provisional objects from unknown tags is designed. For now, observations can exist without objects. This avoids forcing the app to define provisional-object behavior prematurely.

5. **lastObservationSummary**
   - **Decision:** Do not implement `objects.lastObservationSummary` as an active denormalized cache in Phase 2. It may remain a future optional field candidate in the spec. Phase 2 may define supporting types only if doing so does not require update logic. Prefer delaying active summary writes until Phase 3 or Phase 5, when observation creation/backfill logic exists. Existing `objects.identifierSummary` remains only about active identifiers, not observations.

6. **placeLabel**
   - **Decision:** `placeLabel` should be a top-level field on `identifierObservations`. It should not be metadata-only.
   - **Rationale:** human-readable place labels are central to the shared-house/community use case and are useful even without GPS.

7. **anonymous reporter snapshot**
   - **Decision:** Include `observerIsAnonymous?: boolean`. Do not include email snapshot by default. Do not include display-name snapshot by default unless later UI requirements justify it. `observerUid` is the primary reporter identity, including anonymous Firebase Auth UID. UI should present anonymous reporters carefully, e.g. “anonymous reporter”, not as verified owners.

8. **device/sensor observations**
   - **Decision:** Keep `observerKind: "device"` in the model. Do not allow arbitrary client-side device observation writes in the initial implementation. Device observations should later be ingested through Cloud Functions or another authenticated backend/device-auth mechanism. `metadata` may carry RSSI, readerId, antennaId, scanWindowMs, confidence, and similar source-specific values. High-volume device ingestion must trigger a later review of document ID distribution, batching, and write-hotspot risks.

9. **no formal lending/custody model**
   - **Decision:** Do not introduce loans, borrowings, custodyTransfers, currentCustodianUid, or formal delivery-tracking state. The app only needs loose observation evidence such as “this user last reported it”. `lastObservedBy` / `lastReportedBy` means reporter/observer, not holder/borrower.

## Phase 1 exit criteria

- Phase 1 specification document exists.
- Field names and semantics are defined well enough for Phase 2 implementation.
- Later-phase work is explicitly not implemented.
- No Firestore rules changed.
- No `src/types.ts` schema changes were made.
- No `firebase-blueprint.json` schema changes were made.
- No database write/backfill function was added.
- Existing app routes and behavior remain unchanged, except documentation status updates.
- `npm run lint` and `npm run build` pass if any code/config was touched.
