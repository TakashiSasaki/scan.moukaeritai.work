# Project Harness

## Final Product Goal
The final objective of this project is to complete and deploy a Firebase-hosted inventory management application. This application will support managing physical items, markers/identifiers, places, observations, measurements, and related operational history.

## Role of EFP
The Entity/Fact/Projection (EFP) migration and projection work is not an isolated data-model exercise. It is the foundational data model for the final user-facing application. The purpose of the EFP migration is to support reliable item / marker / place / fact / projection workflows in the eventual user-facing app.

## Migration Safety Ladder
To safely reach the final product goal, migration work follows this safety ladder:
1. EFP data model and write builders
2. projection reconstruction semantics
3. selected-target reconciliation
4. local reporting
5. canary planning
6. canary validation
7. readiness assessment
8. backfill design
9. backfill execution planning
10. controlled UI read switching

Operational validation, canary work, and backfill planning are safety mechanisms, not the final product itself.

## Not Yet Authorized
* Backfill execution
* Broad collection scans for backfill
* Scheduled or queue-based recompute
* UI read switching to projection summaries

These actions remain strictly gated by the migration safety ladder and concrete evidence (like canary validation and readiness assessments).

## How Future Work Should Be Judged
All data-model, reconciliation, projection, validation, and backfill work should be evaluated against the final product goal:
* a deployable Firebase application
* a robust inventory / item management data model
* safe migration from legacy data structures
* reliable derived projections for application reads
* controlled operational validation before any broad backfill or UI read switching
* eventual user-facing functionality on top of the EFP model
