<!--
agent-policy-generated: true
source-skill: validate-agent-policy
DO NOT EDIT DIRECTLY
-->
---
name: validate-agent-policy
description: Validate `.agent-policy.yml`, referenced project policy, the lock file, and generated outputs after policy-related changes or policy CI failures.
---

# Validate agent policy

Use this skill when `.agent-policy.yml`, project policy files, generated instructions, or policy CI results change.

1. Locate the Git repository root.
2. Run `agent-policy validate --config .agent-policy.yml`.
3. If validation succeeds, run `agent-policy check --config .agent-policy.yml`.
4. Classify schema, reference, merge, lock, and stale-output failures separately.
5. Do not modify files unless repair or synchronization was explicitly requested.
6. Report the commands executed, the exact failed checks, and any unverified state.
