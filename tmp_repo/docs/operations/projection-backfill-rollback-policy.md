# Projection Backfill Rollback Policy

This document describes the rollback policy at the design level only.

**CRITICAL SAFETY NOTES:**
- No rollback automation is implemented in this stride.
- No backfill execution is implemented in this stride.

## Rollback Principles

- Projection summaries are derived and rebuildable.
- Facts remain source of truth.
- Rollback should not mutate Facts.

## Rollback Strategies

Rollback strategies may include:
- re-running recompute for affected targets
- restoring previous projection snapshots if explicitly captured
- disabling projection read usage before UI switching
- retaining pre/post artifacts for audit
