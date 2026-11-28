---
"@slopmachine/core": minor
---

Add open-source Slop Machine Agent Skill (`skills/slopmachine/SKILL.md` and `references/step-types.md`), a `slopmachine` CLI onboarding helper (`npx @slopmachine/core init` / `login`), and Agent Skill & MCP documentation. The CLI always talks to `https://slopmachine.dev`, writes MCP config that reads the key from the `SLOPMACHINE_API_KEY` environment variable instead of storing it, and is only available as a bin (not an import path).
