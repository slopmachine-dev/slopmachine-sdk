# Agent Guidelines

This repository is a monorepo for the Slop Machine SDK. All AI agents working on this codebase must adhere to the following guidelines and workflows.

## Checking and Maintaining GOTCHAS.md

Before starting any task and whenever troubleshooting an issue:

1. **Check [GOTCHAS.md](./GOTCHAS.md):**
   - Review known pitfalls, quirks, and workarounds across monorepo packages, demo apps, and build systems before writing code or diagnosing errors.
2. **Maintain [GOTCHAS.md](./GOTCHAS.md):**
   - Whenever you discover a non-obvious issue, build failure, dependency quirk, framework-specific edge case, or tricky bug and resolve it, document it in `GOTCHAS.md`.
   - Each entry must include:
     - **Issue / Pitfall:** Description of symptoms or error messages.
     - **Affected Area:** Package(s), app(s), or toolchain involved.
     - **Root Cause:** Why the issue occurs.
     - **Solution / Workaround:** Concrete steps to resolve or avoid the issue.

## Monorepo Architecture

- `packages/core`: Base types, URL generators, and shared logic.
- `packages/react`: React SDK (`@slopmachine/react`). Follow [packages/react/Agents.md](./packages/react/Agents.md) for React-specific coding conventions.
- `packages/svelte`: Svelte 5 SDK (`@slopmachine/svelte`). Follow [packages/svelte/Agents.md](./packages/svelte/Agents.md) for Svelte-specific coding conventions.
- `packages/demo-shared`: Shared demo data, constants, and utilities.
- `apps/demo-react`: React demo application.
- `apps/demo-svelte`: Svelte demo application.
- `apps/docs`: VitePress documentation site.

## Build and Release Workflows

- **Package Builds:** After modifying code in `packages/*`, rebuild before testing demo apps or documentation:
  ```bash
  npm run build:packages
  # or full monorepo build:
  npm run build
  ```
- **Changesets:** Any changes to publishable packages (`packages/core`, `packages/react`, `packages/svelte`) require a changeset:
  ```bash
  npm run changeset
  ```
  Commit the resulting file under `.changeset/`. CI will fail if publishable packages are modified without a changeset.
