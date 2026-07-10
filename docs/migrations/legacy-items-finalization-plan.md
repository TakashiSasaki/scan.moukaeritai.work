# Legacy Items Finalization Plan

## Purpose
This document outlines the procedure to close the legacy `items` migration concern. The legacy dataset consists of only two items. Therefore, rather than building complex automated migration frameworks or executing automated writes, the project will close this phase via an explicit, human-controlled manual finalization procedure.

This finalization path allows the project to move standard operations fully to the normalized schema and eventually archive/remove stale migration guidance, avoiding the overhead of maintaining complex migration code for a nearly empty legacy collection.

## Important Distinctions
* **Phase 7E Remains Blocked:** This finalization plan is entirely separate from Phase 7E (Imported Observation Execution). Phase 7E remains blocked.
* **No Production Writes:** This document defines a read-only audit and a manual procedure. No automated migration execution, deploys, or production writes are performed as part of this PR.

## Finalization Checklist

To finalize the legacy items transition, an administrator must manually perform the following steps:

1. [ ] **Export/Backup:** Export the two legacy items documents outside the repository for safekeeping. **Do not commit this export to the repository.**
2. [ ] **Field-by-Field Verification:** For each legacy item, compare its fields against the corresponding normalized records:
    *   `objects/{objectId}`
    *   `identifiers/{identifierKey}` (QR, manual, NFC, etc., as applicable)
    *   `objectIdentifierBindings/{bindingId}`
    *   `objectImages/{imageId}`
    *   `objectEvents/{eventId}`
3. [ ] **Specific Verifications:**
    *   [ ] Verify object ID normalization.
    *   [ ] Verify `objects.primaryImageUrl` and `objects.primaryImageId` match expected values.
    *   [ ] Verify `objectImages` records exist for both primary and context images.
    *   [ ] Verify `objects.identifierSummary` reflects the active identifiers.
    *   [ ] Verify object ownership fields (`ownerId`) are correctly scoped.
    *   [ ] Verify current location preservation, including `location.address` where present.
4. [ ] **Field Classification Audit:** Explicitly classify every legacy source field using the following statuses. Ensure no field remains as `unmigrated-gap` or `needs-decision`.
    *   `migrated`
    *   `partially-migrated`
    *   `derived-only`
    *   `preserved-as-legacy-reference`
    *   `preserved-as-raw-snapshot`
    *   `intentionally-discarded`

## Pragmatic Handling of `bluetoothTags` and `tagType`

Given the tiny dataset size (2 items), we adopt a pragmatic approach to previously unmigrated fields:

*   **`bluetoothTags`:** Do not implement a full Bluetooth global identifier migration for these two items. Instead, preserve `bluetoothTags` as a raw legacy snapshot (e.g., in a secure archive or as a `legacy.bluetoothTagsSnapshot` metadata field if manual migration is performed). Bluetooth global identity semantics can be implemented later.
*   **`tagType`:** Preserve `tagType` as raw and normalized legacy metadata.
*   **Conclusion:** Preserving raw legacy metadata is sufficient to prevent data loss and unblock normal operation on the normalized schema. Future Bluetooth support may map these snapshots into `identifiers(kind="bluetooth")` and bindings, but that automated translation is not required for this finalization.
