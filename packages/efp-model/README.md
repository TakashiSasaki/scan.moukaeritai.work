# @scan/efp-model

`@scan/efp-model` is the canonical pure shared Entity / Fact / Projection model package for `scan.moukaeritai.work`.

It contains runtime-agnostic TypeScript types and pure helper functions used by the EFP migration, including:

- Entity / Fact / Projection types
- fact participant helpers
- projection reconstruction reducers
- serialization helpers such as `stripUndefinedDeep`

## Purity constraints

This package must remain pure and runtime-agnostic.

It must not import:

- Firebase client SDK
- Firebase Admin SDK
- Firebase Functions
- React
- Vite
- browser-only APIs
- server-only APIs

It must not access Firestore or any other external runtime service.

Timestamp values are represented structurally, using a `toMillis()`-compatible interface, so the same pure reducers can operate on compatible timestamp objects from different runtimes.

## Current status

This package is the canonical source for pure EFP types, participant helpers, projection reducers, and serialization helpers.

Root app paths under `src/types` and `src/lib` may remain as compatibility re-export shims.

## Functions usage

Firebase Functions consumption is a future deployment-boundary validation step.

Do not import root frontend `src/**` modules from `functions/src`.

Do not duplicate EFP reducer logic inside `functions/src`.

Do not assume backend/admin projection recompute is unblocked until this package is explicitly validated inside the Firebase Functions deployment artifact.
