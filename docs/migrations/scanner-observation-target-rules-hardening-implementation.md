# Scanner Observation Target Rules Hardening Implementation

## Status
**implemented-only**

## Purpose
Provides implementation evidence that the target `observations` collection rules have been hardened without violating constraints or authorizing dual-write / read switching.

## Safety Statement
- **Firestore rules changed**: yes, target `observations` only
- **Runtime behavior changed**: no
- **Feature flag enabled**: no
- **Indexes changed**: no
- **Migration execution**: no
- **Firebase calls outside emulator tests**: no
- **Firestore writes outside emulator tests**: no
- **Projection recompute/backfill behavior changed**: no
- **UI read switching**: no
- **Rules deployment approval**: no
