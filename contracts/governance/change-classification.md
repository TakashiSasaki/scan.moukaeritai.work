# Change Classification

This document classifies contract changes into categories, allowing automated tooling to verify whether a given modification triggers breaking-change policies.

## Classifications

### 1. Breaking (Major Bump)
- Removing required fields.
- Renaming fields.
- Changing field types (e.g. from string to object).
- Adding fields to a schema configured with `additionalProperties: false` as required.
- Modifying invariant conditions in `efp-semantics`.

### 2. Additive (Minor Bump)
- Adding optional fields.
- Relaxing required field constraints.
- Adding supported values to a non-strict enum.

### 3. Patch
- Formatting changes in Markdown artifacts.
- Typos and grammatical improvements.
- Schema descriptions and comment updates.
