# Migration Design Checklist

## Scope

This checklist applies to any task that moves existing data into another structure, including:

* data migration
* schema change
* normalization
* imports
* backfills
* storage reorganization

## Required source coverage audit

Every migration must begin with a source coverage audit before implementation or execution.

The audit must inspect:

* source schema definitions
* code that wrote the source data
* field paths actually present in real source data

## Required source-to-target mapping

For each source field, a mapping table must be created in the following format:

`source field path | source evidence | live-data evidence | target collection/field | mapping type | classification | decision/rationale`

## Classification enum

Every source field must be explicitly classified as exactly one of the following:

* `migrated`
* `partially-migrated`
* `derived-only`
* `preserved-as-legacy-reference`
* `preserved-as-raw-snapshot`
* `intentionally-discarded`
* `unmigrated-gap`
* `needs-decision`

## Execution gate

Migrations must strictly adhere to the following execution gates:

* execution must not proceed if any source field is unclassified
* execution must not proceed if any field remains `needs-decision`
* execution must not proceed if any field remains `unmigrated-gap`
* fields not migrated must have explicit rationale
* silent data loss is not acceptable

## Dry-run and review

Migrations should include a dry-run or audit-only phase where practical. Execution must be separately reviewed and approved before running against production data.

## Legacy/raw snapshot policy

Preserving a raw snapshot or legacy reference is acceptable when full semantic mapping is not yet decided, but this must be explicitly documented and deliberate.
