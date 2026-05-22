# Phase 3D: Observation Flow Verification

## Scope

This phase verifies and cleans up the Phase 3A–3C observation-only flow.

It does **not** implement:
- anonymous sign-in
- device ingestion
- imported observations
- backfill
- provisional objects
- sharing/community membership semantics
- custody/loan workflows

## Expected write behavior

When an unknown identifier is observed:
- create or update `identifiers/{identifierKey}`
- create `identifierObservations/{observationId}`
- do not create `objects`
- do not create `objectIdentifierBindings`
- do not create `objectEvents`

For a newly created identifier:
- `status: "unassigned"`
- `discoveryState: "observed"`
- no `objectId`
- owner is current user
- first/last observation fields are set

For an existing owned identifier:
- update last observation fields
- do not overwrite object/binding state

For an existing identifier owned by another user:
- fail with user-facing error
- do not reassign ownership
- do not create observation

## Manual test cases

### 1. Unknown QR scan
- Scan an unknown QR.
- Confirm `/unassigned` receives QR source.
- Click 「観測だけ記録」.
- Optionally enter `placeLabel` and `note`.
- Save.
- Confirm `identifierObservations/{observationId}` exists.
- Confirm observation ID is UUIDv7-like.
- Confirm `source == "qr"`.
- Confirm `observationType == "scan"`.
- Confirm `observerKind == "user"`.
- Confirm `observerUid` matches current user.
- Confirm `receivedAt` and `createdAt` are server timestamps.
- Confirm `identifiers/{identifierKey}` exists as `unassigned` / `observed`.
- Confirm no object/binding/event was created.

### 2. Unknown NFC scan
- Same as QR, but source should be `"nfc"`.

### 3. Invalid `/unassigned` route state
- Open `/unassigned` directly without route state.
- Confirm error screen appears.
- Confirm no observation write is possible.
- Confirm scanner/home recovery buttons work.

### 4. Existing owned identifier
- Observe an identifier already owned by the current user.
- Confirm last observation fields update.
- Confirm first observation fields are not destructively overwritten unless absent.
- Confirm observation record is created.

### 5. Existing other-user identifier
- Attempt observation against an identifier owned by another user, using emulator or controlled test data if practical.
- Confirm user-facing error appears.
- Confirm no ownership reassignment occurs.
- Confirm no observation is created.

### 6. Rules rejection sanity checks
- Confirm client code does not write `"import"`, `"imported"`, `"gateway"`, `"ble"`, `"proximity"`, or `"gateway_seen"`.
- Confirm direct client-created device/system observations are not part of this UI flow.

### 7. Regression checks
- Existing Create New Object from `/unassigned` still works.
- Existing Attach to Existing Object from `/unassigned` still works.
- Existing active identifier scan still navigates to object detail.
- Existing scanner cancel/home navigation still works.

## Known limitations

- Manual/barcode/camera observation source flows are not fully connected unless already present.
- Anonymous sign-in is not implemented.
- Device/sensor observations are not implemented.
- Imported observations are not implemented.
- Backfill and diagnostics are later phases.
- Community sharing semantics are not implemented.

## Phase 3D exit criteria

- lint/build pass
- observation-only flow has no object/binding/event side effects
- route-state validation is hardened
- typed error handling is in place
- verification protocol is documented
- scope checks show no Phase 4+ implementation
