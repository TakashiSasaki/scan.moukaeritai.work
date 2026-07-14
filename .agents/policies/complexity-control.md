# Complexity control policy

- Prioritize the EFP-native Object/Marker/Association vertical slice first.
- Legacy migration, automatic/background dual-write, backfill, and reconciliation remain cancelled.
- Controlled imported observation execution is a restricted administrative exception, writing only to identifierObservations without modifying any legacy collections.
- Verification is split into `verify:fast`, `verify:pr`, and `verify:release`.
- Normal tasks must not add mandatory gates.
- Normal tasks must not add mutation fixtures.
- Normal tasks must not create contract versions for internal changes.
- Unrelated findings go to backlog instead of expanding the current task.
- Complexity-increasing changes require human approval.
