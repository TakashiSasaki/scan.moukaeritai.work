# Phase 7D.2: Observable Identifier and Signal Observation Model

## Scope

This phase designs a future-proof data model for:
- Bluetooth tags
- BLE beacons
- Wi-Fi access points / BSSID / nearby AP beacons
- sensor network observations
- Android companion app observations
- gateway observations
- loose observation grouping / observation sets
- identifier-to-target bindings beyond object-only bindings

This phase is **design-only**. During this phase there will be:
- **no** Firestore writes
- **no** migration execution
- **no** schema implementation
- **no** deployment
- **no** UI changes

## Why this phase exists

- Phase 7D.1 confirmed legacy `items.bluetoothTags` exists in live data.
- The current migration does not map `bluetoothTags`.
- Bluetooth tags should be treated as identifiers or observable signal sources.
- Bluetooth and Wi-Fi radio signals can characterize objects, locations, containers, groups, gateways, or environments.
- Radio observations may occur in sets, such as multiple identifiers detected during the same scan or gateway event.
- The data model should be designed now to reduce the chance of another migration later.

## Current schema capability audit

### IdentifierRecord
Current:
- `kind`: "qr | nfc | manual | barcode | bluetooth"
- `scheme`
- `rawValue`
- `canonicalValue`
- `status`
- `label`
- optional `objectId`
- observation summary fields

Limitations:
- no Wi-Fi AP kind
- no BLE beacon distinction beyond "bluetooth"
- no structured kind-specific properties
- optional `objectId` can imply single-object association and is weak for shared/location/group signals
- no first-class privacy model for radio identifiers

### IdentifierObservationRecord
Current:
- `source`: includes "nfc", "qr", "manual", "barcode", "ble", "camera", "gateway", "import"
- `observationType`: includes "sighting", "scan", "proximity", "gateway_seen", "imported"
- has `observedAt`, `receivedAt`, optional `location`, optional `metadata`

Limitations:
- no "wifi" source
- no "android_companion" source
- no "sensor_node" source
- no first-class `observationSetId`
- radio metadata is only possible through generic metadata
- client write rules currently restrict sources/types; BLE/Wi-Fi/gateway ingestion should remain backend/trusted-device only unless explicitly designed later

### ObjectIdentifierBindingRecord
Current:
- binds `objectId` to `identifierKey`
- supports status and attached/detached timestamps

Limitations:
- object-only target
- cannot bind identifiers to locations, containers, groups, gateways, or environments
- lacks relationship semantics such as attached, associated, location-marker, proximity-anchor, group-marker, environment-signal
- not sufficient for shared Bluetooth tags or Wi-Fi AP environment signals

### ObjectRecord / ObjectEventRecord
Current location/event support:
- object can have `currentLocation`
- events can have `location`

Limitations:
- these do not represent a signal source being installed at or associated with a location

## Conceptual model

The observable identifier data model requires four layers:

1. **Identifier / Signal Source**
   - stable or semi-stable observable entity
   - examples: QR token, NFC UID, barcode, Bluetooth tag, BLE beacon, Wi-Fi AP/BSSID, gateway, sensor node

2. **Identifier Observation**
   - an observed fact at a time and possibly a location
   - examples: BLE seen at RSSI -70, Wi-Fi AP seen on channel 6, gateway saw tag X

3. **Observation Set**
   - loose grouping of observations from a single scan, gateway batch, time window, import batch, or companion app scan
   - not a database transaction
   - a correlation/grouping record only

4. **Identifier Target Binding**
   - semantic relationship between an identifier/signal and a target
   - target may be object, location, container, group, gateway, or future target kind

**Emphasize:**
- observation sets are evidence grouping, not object identity.
- bindings represent semantic relationships.
- observations record evidence.
- identifiers represent stable or semi-stable signal sources.

## Identifier kind and scheme design

We recommend a cautious hybrid approach for identifier kinds:

- Keep existing `bluetooth` kind for backward compatibility.
- Use `scheme` for immediate subtype distinction.
- Reserve future explicit kinds like `wifi_ap`, `ble_beacon`, `gateway`, `sensor_node` for later schema extension if needed.

**Example schemes:**
- kind `bluetooth`, scheme `bluetooth-legacy-tag-id`
- kind `bluetooth`, scheme `ble-device-id`
- kind `bluetooth`, scheme `ble-beacon-id`
- kind `barcode`, scheme `ean-13`
- kind `nfc`, scheme `nfc-uid`
- kind `qr`, scheme `qr-url-token`

## Kind-specific properties

The current `IdentifierRecord` is common-field oriented and does not yet represent type-specific properties.
Future structured properties may look like this (do not implement yet):

```typescript
properties?: {
  bluetooth?: {
    legacyTagId?: string;
    legacyName?: string;
    idEncoding?: "base64" | "hex" | "uuid" | "unknown";
    protocol?: "ble" | "classic" | "unknown";
  };
  wifi?: {
    bssidHash?: string;
    ssidHash?: string;
    ssidRedacted?: boolean;
  };
  radio?: {
    stableIdKind?: string;
  };
}
```

**State:**
- Stable properties may live on identifier records.
- Dynamic values like RSSI must not be identifier properties.
- Dynamic values belong in observations.

## Observation metadata design

The following fields should belong to observation metadata:
- `rssi`
- `txPower`
- `channel`
- `frequencyMHz`
- `gatewayId`
- `scannerDeviceId`
- `collectorApp`
- `collectorPlatform`
- `detectionOrder`
- `scanDurationMs`
- `ssidHash`
- `bssidHash`
- `rawSampleRedacted`

**State:**
- RSSI is observation-specific, not identifier-specific.
- Wi-Fi channel/frequency may be observation-specific.
- gateway/scanner identity is observation context.
- raw values should be minimized or redacted for privacy.

## Observation sets

Future `observationSets` will provide a loose grouping of observations, not a strict transaction. It can represent one BLE scan window, one Wi-Fi scan, one gateway batch, one Android companion app scan, or one import batch.
Individual observations can reference `observationSetId`.

**Conceptual fields:**
```typescript
interface ObservationSetRecord {
  observationSetId: string;
  ownerId: string;
  source:
    | "ble"
    | "wifi"
    | "gateway"
    | "android_companion"
    | "sensor_node"
    | "qr"
    | "nfc"
    | "import";
  groupingMode:
    | "single-scan"
    | "time-window"
    | "gateway-batch"
    | "companion-scan"
    | "sensor-batch"
    | "import-batch";
  startedAt: Timestamp;
  endedAt?: Timestamp;
  receivedAt: Timestamp;
  observerKind: "user" | "device" | "system";
  observerUid?: string;
  observerDeviceId?: string;
  gatewayId?: string;
  location?: ObservationLocation;
  placeLabel?: string;
  observationCount: number;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
  createdAt: Timestamp;
}
```

**Recommend:**
- add `observationSetId` to `IdentifierObservationRecord` in a future implementation phase
- do not implement in Phase 7D.2

## Identifier target bindings

Current `objectIdentifierBindings` is object-only and insufficient for location-attached Bluetooth tags, Wi-Fi AP environment markers, group-level beacons, container-level identifiers, or gateway-associated signal sources.

**Future `identifierTargetBindings` concept:**
```typescript
interface IdentifierTargetBindingRecord {
  bindingId: string;
  ownerId: string;
  identifierKey: string;
  targetKind:
    | "object"
    | "location"
    | "container"
    | "group"
    | "gateway";
  targetId: string;
  relationshipKind:
    | "attached"
    | "associated"
    | "location-marker"
    | "proximity-anchor"
    | "group-marker"
    | "environment-signal";
  confidence?: number;
  status: "active" | "detached" | "replaced";
  attachedAt: Timestamp;
  detachedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: Record<string, unknown>;
}
```

**State:**
- existing `objectIdentifierBindings` can remain for current object-only flows
- generic target bindings may be introduced later
- legacy `bluetoothTags` should not force the system into object-only semantics permanently

## Bluetooth legacy migration implication

Legacy `items.bluetoothTags` should be treated as follows:
- migrate `bluetoothTags[].id` to a `IdentifierRecord` with `kind = "bluetooth"`
- use `scheme = "bluetooth-legacy-tag-id"` unless a better scheme is discovered
- store original tag ID as `rawValue`
- canonicalize the tag ID into `canonicalValue`
- use `bluetoothTags[].name` as `label`
- do not use raw Bluetooth tag ID directly as Firestore document ID
- use deterministic UUIDv5-based `identifierKey`
- create object binding only if current legacy data semantically indicates attachment to that item/object
- do not treat Bluetooth as always object-exclusive
- `bluetoothTags[].rssi` should be observation metadata, not identifier property
- `bluetoothTags[].linkedAt` is a binding timestamp candidate, not a stable identifier property

## Wi-Fi / nearby AP future support

- browser-based app usually cannot collect nearby AP beacon data
- sensor network nodes and native Android companion apps may collect it
- this should be modeled as trusted-device/backend ingestion, not ordinary web-client writes
- Wi-Fi AP data is privacy-sensitive and location-revealing

**Suggested future handling:**
- represent AP/BSSID as observable signal source or identifier
- avoid raw BSSID/SSID storage where possible
- use owner-scoped hash or salted hash if feasible
- store RSSI/channel/frequency in observation metadata
- group a Wi-Fi scan into an observation set
- keep default visibility private

## Privacy and retention

- BLE/Wi-Fi radio environment data is location-sensitive
- BSSID/SSID and nearby AP lists can reveal physical location
- raw radio identifiers should be minimized, hashed, redacted, or access-controlled
- owner scoping is mandatory
- retention policy should be considered before implementation
- no public/community visibility by default for radio observations

## Migration completeness implications

Phase 7E remains blocked until decisions are made for:
- `bluetoothTags`
- `bluetoothTags[].id`
- `bluetoothTags[].name`
- `bluetoothTags[].rssi` if present later
- `bluetoothTags[].linkedAt` if present later
- `tagType`

Phase 7D.2 does not close the gap by itself. It defines the model needed to close it safely.

## Recommended next phases

- **Phase 7D.3 — Bluetooth legacy migration dry-run design**: Design the specific conversion of legacy `bluetoothTags` to the new target schemas based on this conceptual model.
- **Phase 7D.4 — Optional schema extension proposal for observationSetId / identifierTargetBindings**: Formally propose extensions to the schemas, incorporating elements designed in Phase 7D.2.
- **Phase 7D.5 — Field coverage decision closure**: Resolve final decisions regarding `bluetoothTags`, `tagType`, and any other remaining coverage gaps.
- **Phase 7E-1 — Final controlled execution for imported baseline observations**: Begin importing standard baseline observation data into the newly migrated setup.
- **Phase 7E-2 — Final controlled execution for Bluetooth legacy identifier migration, if approved**: Execute the `bluetoothTags` migration utilizing the design patterns defined in 7D.2 and planned in 7D.3.
- **Phase 8 — Archive/remove legacy migration tools only after all migration completeness gates pass**: Complete teardown of old migration tooling once no remaining execution paths or unmigrated gaps exist.

## Follow-up

See [Phase 7D.3: Bluetooth Legacy Migration Dry-run Design](phase-7d3-bluetooth-legacy-migration-dry-run-design.md) for the concrete dry-run translation of this model.
