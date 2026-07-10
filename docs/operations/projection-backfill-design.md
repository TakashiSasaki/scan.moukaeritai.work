# Projection Backfill Design

This document outlines the design requirements for future projection backfill planning. It is a design document, not an execution plan. **Backfill execution is not currently implemented or authorized.**

## Preconditions for Designing Backfill
Before designing a backfill execution strategy, the following preconditions must be met:
* The result from `ops:assess-projection-backfill-readiness` must be exactly `ready-for-backfill-design`.
* Evidence from objects, markers, and places must exist.
* Canary validation evidence must exist, unless explicitly waived.

## Idempotency Expectations
The backfill design relies on the core EFP idempotency guarantees:
* Recomputing a projection must be safe to repeat for the same target without corrupting state.
* Projections are purely derived and rebuildable models.
* Facts remain the immutable source of truth.

## Failure Handling Categories
Backfill execution must be designed to handle the following categories of failures:
* **Target not found:** A target ID is provided, but no Facts exist to construct it.
* **Recompute mismatch after write:** A newly written projection summary does not match expected derived results.
* **Callable failure:** Transient or permanent failures when invoking the Cloud Function.
* **Partial batch failure:** Some targets in a batch succeed while others fail.
* **Count mismatch in evidence:** Discrepancies between expected target counts and processed counts.

## Post-Backfill Validation Requirements
Once backfill execution is designed and authorized, any backfilled data must meet these validation requirements before UI read switching is permitted:
* **Selected reconciliation:** Explicit reconciliation runs against the backfilled targets.
* **Report:** Generation of a clean local reconciliation report.
* **Canary-style validation or equivalent:** Proof that the live reads match expected values.
* **Explicit Gate:** No UI read switching is allowed without explicit authorization.

## Restrictions
* Broad collection scans must not be added casually. Backfill target lists should be explicit and bounded.
* Batch size and retry policy must be fully designed before execution begins.
* Broad backfill execution remains strictly future work.
