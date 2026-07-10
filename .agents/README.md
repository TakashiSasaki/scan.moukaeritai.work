# Agent Support Files

This directory (`.agents/`) contains project-specific support files for coding agents.

## Purpose

The primary purpose of this directory is to store standard operating procedures, validation steps, and helper scripts in a way that multiple AI coding agents can discover and utilize them automatically. By keeping these skills centralized, we avoid duplicating complex multi-step procedures in ad-hoc prompts and maintain a consistent operational approach.

## Structure

- `.agents/skills/` - The canonical directory for all project-specific agent skills.
- `AGENTS.md` - Located at the root of the repository, this file instructs agents to look here for relevant skills.

Each skill is contained in a separate subdirectory within `.agents/skills/` (e.g., `.agents/skills/manage-efp-migration/SKILL.md`).

## Rules

- **No Secrets**: Do not store any sensitive information here. Tokens, API keys, authentications cookies, personal access tokens, absolute local paths, and terminal-specific configurations MUST NOT be committed. Use `.env.example` or placeholders instead.
- **Maintainability**: When the project's architecture or scripts change, the corresponding `SKILL.md` files should be updated simultaneously.
