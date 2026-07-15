# Complexity control policy

- Prioritize the EFP-native Object/Marker/Association vertical slice first.
- Legacy migration, automatic/background dual-write, backfill, and reconciliation remain cancelled.
- Controlled imported observation execution is a restricted administrative exception, writing only to identifierObservations without modifying any legacy collections.
- Verification is split into `verify:fast`, `verify:pr`, and `verify:release`.
- Normal tasks must not add mandatory gates.
- Normal tasks must not add mutation fixtures.
- Normal tasks must not create contract versions for internal changes.
- Validation, hardening, and verification tasks must not introduce new architectural, routing, naming, access-control, compatibility, or migration constraints unless that constraint already exists in an authoritative policy or architecture document. Specifically, validation code must not infer:
  - path-prefix requirements from surface classification;
  - dynamic-route allowlists;
  - new role taxonomies from access values;
  - closed lists of otherwise valid future routes.
  Additionally, tests for extracted validation or classification logic must import the production implementation. Tests must not duplicate the production rules.
- Unrelated findings go to backlog instead of expanding the current task.
- Complexity-increasing changes require human approval.
