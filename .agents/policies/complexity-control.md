# Complexity control policy

- Prioritize the EFP-native Object/Marker/Association vertical slice first.
- Legacy migration, dual-write, backfill, reconciliation, and runtime integration remain cancelled.
- Verification is split into `verify:fast`, `verify:pr`, and `verify:release`.
- Normal tasks must not add mandatory gates.
- Normal tasks must not add mutation fixtures.
- Normal tasks must not create contract versions for internal changes.
- Unrelated findings go to backlog instead of expanding the current task.
- Complexity-increasing changes require human approval.
