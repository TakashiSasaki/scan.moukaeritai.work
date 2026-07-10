# Scanner Observation Target Rules Hardening Design

## Status

**implementation-complete**

## Purpose

The purpose of this document is to structure the future `firestore.rules` hardening requirements for the target `observations` collection. It establishes the `allowCreate` contract, required `deny` conditions, test matrix cases, and conceptual fixture definitions needed to securely deploy the target schema before enabling any dual-write runtime changes.

## Safety Boundary / Non-Goals

This design is strictly a documentation and local-only validation stride. The following are explicit non-goals and must not occur within this stride:
- Changing runtime behavior.
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

## Allow-Create Contract

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

## Future PR Sequencing

1. Rules/index readiness blueprint validation
2. Target rules hardening design validation (Complete)
3. Firestore rules hardening PR (Implementation complete via tests)
4. Scanner Observation Dual-Write Readiness Gate validation
5. Controlled Scanner observation dual-write validation

## Interpretation

The rules have been implemented and validated via `firestore.rules.test.ts`. This still does not enable `VITE_ENABLE_SCANNER_OBSERVATION_DUAL_WRITE`. This still does not change Scanner runtime behavior. This still does not authorize UI read switching. Rollout remains a separate explicit PR/operator action. See `scanner-observation-dual-write-runtime-contract-evidence.md` for proof of the explicit runtime boundary closure.
