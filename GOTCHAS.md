# Gotchas, Pitfalls, and Workarounds

A living registry of known issues, pitfalls, framework quirks, build errors, and their corresponding solutions or workarounds across the Slop Machine SDK monorepo.

> **For AI Agents & Developers:** Consult this file before starting tasks or diagnosing issues. If you encounter a new pitfall and solve it, add an entry below following the standard format.

---

## Entry Template

When adding a new entry, use the following structure:

```markdown
### [Short descriptive title of the issue]

- **Affected Area:** `<packages/apps/tools affected>`
- **Symptoms / Error:** Describe the unexpected behavior, failure, or error message.
- **Root Cause:** Explain why this happens.
- **Solution / Workaround:** Provide the fix, workaround, or recommended alternative.
```

---

## Known Gotchas

### Package changes not reflected in demo apps or docs

- **Affected Area:** `packages/*`, `apps/*`
- **Symptoms / Error:** Changes made in `@slopmachine/core` or `@slopmachine/react` do not show up when running `npm run dev:react` or viewing docs.
- **Root Cause:** Local workspace dependencies link to the built output in `dist/` rather than raw TypeScript source files.
- **Solution / Workaround:** Run `npm run build:packages` (or `npm run build`) whenever you modify code in `packages/*` before running dev servers.

---

### PR CI failure due to missing Changeset

- **Affected Area:** `packages/core`, `packages/react`, `packages/svelte`, GitHub Actions CI
- **Symptoms / Error:** GitHub Actions pull request check fails with `npx changeset status --since=origin/main`.
- **Root Cause:** Changes were made to publishable packages without generating a corresponding changeset file in `.changeset/`.
- **Solution / Workaround:** Run `npm run changeset`, select the affected packages, specify the bump type (major, minor, patch), enter a summary, and commit the generated markdown file.

---

### Svelte 5 Runes requirement

- **Affected Area:** `packages/svelte`, `apps/demo-svelte`
- **Symptoms / Error:** Using legacy Svelte 4 reactivity syntax (`let x = ...; $: double = x * 2;`) or standard prop exports (`export let prop;`) causes compiler warnings or breaks reactivity.
- **Root Cause:** `@slopmachine/svelte` targets Svelte 5 exclusively and requires runes for state and props.
- **Solution / Workaround:** Use Svelte 5 runes exclusively: `$props()` for props with `...restProps`, `$state()` for local state, `$derived()` for computed values, and `$effect()` for side effects.

---

### Svelte package unbundled source distribution

- **Affected Area:** `packages/svelte`
- **Symptoms / Error:** Expecting a pre-compiled JS bundle or `dist/` directory for `@slopmachine/svelte` causes build or import errors.
- **Root Cause:** `@slopmachine/svelte` is published as uncompiled source code (`src/index.ts`) so consuming bundlers (like SvelteKit or Vite) compile Svelte components directly.
- **Solution / Workaround:** Do not attempt to run a bundler or emit pre-compiled JS in `packages/svelte`; ensure `package.json` points `"svelte"`, `"main"`, and `"exports"` directly to `./src/index.ts`.
