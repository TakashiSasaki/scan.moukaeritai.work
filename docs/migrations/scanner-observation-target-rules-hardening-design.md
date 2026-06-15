# Scanner Observation Target Rules Hardening Design

## Status

**planning-only**

## Purpose

The purpose of this document is to structure the future `firestore.rules` hardening requirements for the target `observations` collection. It establishes the `allowCreate` contract, required `deny` conditions, test matrix cases, and conceptual fixture definitions needed to securely deploy the target schema before enabling any dual-write runtime changes.

## Safety Boundary / Non-Goals

This design is strictly a documentation and local-only validation stride. The following are explicit non-goals and must not occur within this stride:
- Changing runtime behavior.
- Modifying `firestore.rules`.
- Modifying `firestore.indexes.json`.
- Enabling the `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE` feature flag.
- Executing data migrations.
- Executing Firebase network calls or Firestore writes.
- Modifying projection recompute/backfill behaviors.
- Authorizing UI read switching.

## Source Artifacts

- [Scanner Observation Dual-Write Readiness](scanner-observation-dual-write-readiness.json)
- [Drift Closure Plan](entity-fact-projection-drift-closure-plan.json)
- [Drift Audit](entity-fact-projection-drift-audit.json)

## Target Collection

The target collection for these rules is `observations`. The legacy `identifierObservations` collection remains unchanged and authoritative for current operations.

## Future Allow-Create Contract

- **Operation**: `create`
- **Collection**: `observations`
- **Allowed Actors**: `authenticated-user`
- **Disallowed Actors**: `signed-out-user`
- **Owner Constraint**: `ownerId must equal request.auth.uid`
- **Observer Constraint**: `observerKind must be user and observerUid must equal request.auth.uid`
- **Time Constraint**: `receivedAt and createdAt must equal request.time; observedAt must be timestamp`
- **Allowed Sources**: `nfc`, `qr`, `manual`, `barcode`, `camera`
- **Allowed Observation Types**: `sighting`, `scan`
- **Required Fields**: `observationId`, `identifierKey`, `ownerId`, `observerKind`, `observerUid`, `observedAt`, `receivedAt`, `source`, `observationType`, `createdAt`
- **Optional Fields**: `objectId`, `observerIsAnonymous`, `placeLabel`, `location`, `note`, `metadata`, `visibility`, `schemaVersion`
- **Unknown Fields Rejected**: `true`
- **Normal User Update Allowed**: `false`
- **Normal User Delete Allowed**: `false`
- **Admin Delete Allowed**: `true`
- **Read Switching Authorized**: `false`

## Future Deny Contract

- signed-out create is denied
- ownerId not matching auth uid is denied
- observerUid not matching auth uid is denied
- observerKind other than `user` is denied for client writes
- unknown field is denied
- invalid source is denied
- invalid observationType is denied
- invalid location latitude/longitude is denied
- receivedAt not equal to request.time is denied
- createdAt not equal to request.time is denied
- normal user update is denied
- normal user delete is denied
- client imported/system/gateway/proximity observations are denied
- projection write through observations rules is impossible
- read switching is not authorized

## Rules Test Matrix

The following tests are required for the future rules validation:
- `owner-can-create-valid-observation`
- `signed-out-cannot-create-observation`
- `owner-mismatch-denied`
- `observer-uid-mismatch-denied`
- `observer-kind-device-denied-for-client`
- `unknown-field-denied`
- `invalid-source-denied`
- `invalid-observation-type-denied`
- `invalid-location-denied`
- `received-at-must-be-request-time`
- `created-at-must-be-request-time`
- `normal-user-update-denied`
- `normal-user-delete-denied`
- `admin-delete-allowed`
- `read-switching-not-authorized`
- `projection-write-not-authorized`

## Fixture Contract

Conceptual definitions for the test payloads:
- `validObservation`: baseline valid client-created scanner observation.
- `unknownFieldObservation`: payload containing unexpected fields.
- `ownerMismatchObservation`: payload with `ownerId` set to a different user.
- `observerMismatchObservation`: payload with `observerUid` set to a different user.
- `invalidSourceObservation`: payload with an out-of-bounds `source`.
- `invalidObservationTypeObservation`: payload with an out-of-bounds `observationType`.
- `invalidLocationObservation`: payload with `location` out of valid latitude/longitude bounds.
- `invalidTimeObservation`: payload with `receivedAt` or `createdAt` detached from request time.
- `deviceObserverObservation`: payload with `observerKind` set to `device`.
- `systemImportedObservation`: payload simulating an imported or system-level observation.

## Index Planning

- `indexesChangedInThisStride: false`
- **Likely Future Query Patterns**:
  - `observations` by `identifierKey`
  - `observations` by `ownerId`
  - `observations` by `objectId`
  - `observations` by `receivedAt`
  - `observations` by `observedAt`
- Index decisions are deferred until the runtime query path is actually implemented.
- No index file changes are included in this stride.

## Future PR Sequencing

1. Rules/index readiness blueprint validation
2. Target rules hardening design validation (This Stride)
3. Firestore rules hardening PR
4. Scanner Observation Dual-Write Readiness Gate validation
5. Controlled Scanner observation dual-write validation

## Validation

- The JSON design file is structurally validated by the `ops:validate-scanner-observation-target-rules-hardening-design` script.
- Cross-validation against the `readiness`, `closure-plan`, and `drift-audit` artifacts guarantees constraints align with the broader migration plan.

## Interpretation

Passing the `scanner-observation-target-rules-hardening-design` validation is not approval to deploy rules. It solely verifies that the constraints, deny matrix, and test plans for the future `firestore.rules` hardening PR are correctly documented and structured as required by the EFP model migration strategy.
