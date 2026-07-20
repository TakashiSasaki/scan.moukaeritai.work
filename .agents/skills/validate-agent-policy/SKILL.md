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

Use this skill when `.agent-policy.yml`, project policy files, generated instructions, generated skills, the lock file, or policy CI results change.

1. Locate the Git repository root and read `toolchain.repository` and `toolchain.revision` from `.agent-policy.yml`.
2. Use only that full pinned revision. Do not substitute `main`, another mutable branch, or an unpinned package release.
3. If a suitable `agent-policy` command is already available, run:
   - `agent-policy --repository . validate --config .agent-policy.yml`
   - `agent-policy --repository . check --config .agent-policy.yml`
4. If the command is unavailable, execute the pinned toolchain in an isolated environment. Replace `<repository>` and `<revision>` with the values from `.agent-policy.yml`:

   ```bash
   uvx --from "git+https://github.com/<repository>.git@<revision>" \
     agent-policy --repository . validate --config .agent-policy.yml
   uvx --from "git+https://github.com/<repository>.git@<revision>" \
     agent-policy --repository . check --config .agent-policy.yml
   ```

   When `uvx` is unavailable, create a temporary virtual environment, install the same full-SHA Git reference, and run both commands from that environment. Do not install an unpinned toolchain globally.
5. Classify schema, reference, merge, lock, obsolete-output, and stale-output failures separately.
6. Do not edit generated files directly. Modify semantic inputs, run the pinned toolchain's `render` command with `--config .agent-policy.yml` when synchronization was requested, and then repeat `validate` and `check`.
7. Do not modify files unless repair or synchronization was explicitly requested.
8. Report the exact revision and commands executed, the failed checks, and any unverified state.

For GitHub Actions, use the pinned composite action from `toolchain.repository` at `toolchain.revision` with `command: check` and `config: ".agent-policy.yml"`. The upstream reference workflow is `templates/workflows/check-agent-policy.yml.j2` in the toolchain repository.
