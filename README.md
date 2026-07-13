# scan.mw

Cloud-based item tracking and inventory management built on Firebase, React, TypeScript, and the Contract-First Entity-Fact-Projection (EFP) model.

## Current priority

The project is focused on the first usable EFP-native vertical slice:

1. Create an Object.
2. Create a Marker.
3. Attach the Marker to the Object.
4. Read the Marker.
5. Display the associated Object.
6. Detach the Association.
7. Treat the detached Marker as unassigned.

This slice is limited to Object, Marker, Association attach/detach, and the read models needed to show the current relationship. Place, Observation, Measurement, Event, projection backfill, generic watermarks, processing receipts, migration phases, and broad future abstractions are outside the critical path unless directly needed for this slice.

## Legacy data policy and Controlled Import Exception

Legacy data is retained as a read-only Firestore archive. No automatic or comprehensive migration is performed.

- **Legacy source collections**: Existing legacy collections (e.g., `items`, `identifiers`, `objectIdentifierBindings`) remain strictly read-only and must not be created, updated, or deleted.
- **Controlled imported observation execution**: Only when an administrator explicitly initiates it (`execute` mode), the legacy `identifiers` collection is read to create deterministic imported baseline observations in `identifierObservations`.
- This exception **does not** imply:
  - Any updates or deletions of legacy source documents.
  - Automatic, background, or scheduled migration.
  - Dual-write or backfill of all records.
  - Relational reconciliation frameworks or automatic production execution.

## Development

```bash
npm ci
npm run dev
```

The app runs on port `3000`.

## Verification tiers

```bash
npm run verify:fast
npm run verify:pr
npm run verify:release
```

- `verify:fast` is for normal local task checks.
- `verify:pr` is for pull requests and GitHub Actions.
- `verify:release` is for release candidates and explicit full validation.
- `verify:baseline` is kept as an alias for `verify:release` for compatibility.

Firestore Emulator integration tests are planned for GitHub Actions. Current PR verification uses Node-based static policy checks only; do not add a local pseudo-emulator.

## Canonical references

- Application version: `package.json`
- Active contract profile: `contracts/profiles/current-application.json`
- Contract registry: `contracts/registry.json`
- Route access policy: `src/lib/routeCatalog.ts`
- Agent rules: `AGENTS.md`
- Agent skills: `.agents/skills/manifest.json`
- Complexity control policy: `.agents/policies/complexity-control.md`
