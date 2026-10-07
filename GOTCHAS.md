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
- **Symptoms / Error:** The "Check for changeset on PRs" CI step fails with `Some packages have been changed but no changesets were found` from `npx changeset status --since=origin/main`.
- **Root Cause:** Files in a publishable package changed in this PR without a changeset added in this PR. A changeset already pending on `main` doesn't count. PRs touching only docs, demos, `demo-shared`, CI or root files never need one.
- **Solution / Workaround:** Run `npm run changeset`, select the affected packages, specify the bump type (major, minor, patch), enter a summary, and commit the generated markdown file. If the package change shouldn't produce a release (tests, dev tooling, comments), commit an empty changeset from `npx changeset add --empty`.

---

### Svelte 5 Runes requirement

- **Affected Area:** `packages/svelte`, `apps/demo-svelte`
- **Symptoms / Error:** Using legacy Svelte 4 reactivity syntax (`let x = ...; $: double = x * 2;`) or standard prop exports (`export let prop;`) causes compiler warnings or breaks reactivity.
- **Root Cause:** `@slopmachine/svelte` targets Svelte 5 exclusively and requires runes for state and props.
- **Solution / Workaround:** Use Svelte 5 runes exclusively: `$props()` for props with `...restProps`, `$state()` for local state, `$derived()` for computed values, and `$effect()` for side effects.

---

### Svelte package is built with `svelte-package`, not bundled

- **Affected Area:** `packages/svelte`, `apps/demo-svelte`
- **Symptoms / Error:** Svelte changes don't show up in the demo, or `@slopmachine/svelte` can't be resolved, because `dist/` is missing or stale.
- **Root Cause:** The package is built with `@sveltejs/package` (`svelte-package -i src -o dist`). It still ships **uncompiled** `.svelte` components so the consumer's Svelte compiler handles them, but `index.ts` becomes `index.js` and every component gets a `.svelte.d.ts`. `"svelte"`, `"types"` and `"exports"` point at `dist/`. Components keep `lang="ts"` on purpose, because Svelte 5 compiles TypeScript in components natively.
- **Solution / Workaround:** Run `npm run build:packages` after changing `packages/svelte/src` (like the other packages). Never point `package.json` back at `src/`, and never bundle or pre-compile the components.

---

### Stale `node_modules` surfaces as misleading type errors

- **Affected Area:** `packages/core`, `packages/react`, `packages/svelte`
- **Symptoms / Error:** `npm run build:packages` fails with `TS2307: Cannot find module '<some dependency>'` (originally `@pixerate/schemas`, since removed) in core, followed by `TS7016: Could not find a declaration file for module '@slopmachine/core'` and `Property 'bucketId' does not exist on type 'SlopTextProps'` in react/svelte. The JS bundles still emit, so `dist/` looks partly built.
- **Root Cause:** `node_modules` is out of sync with `package-lock.json` (a dependency was never installed). Core's DTS step fails, so no `dist/index.d.ts` is written, and every downstream package loses the core types. The SlopText "missing property" errors are a side effect, not real bugs.
- **Solution / Workaround:** Run `npm ci` at the repo root, then `npm run build:packages`. Check `npm ls <dependency>` if in doubt.

---

### DOMPurify silently stops sanitizing if imported before a DOM exists

- **Affected Area:** `packages/core` (`renderMarkdown`), tests or SSR setups that create a DOM after import
- **Symptoms / Error:** Sanitized output is either fully HTML-escaped or, worse, returned unsanitized, even though `window` exists by the time `sanitize()` is called.
- **Root Cause:** The default `dompurify` export initialises once at import time. If no `window` existed then (Node, or jsdom set up after the import), `isSupported` is `false` forever, and in that state `DOMPurify.sanitize()` returns its input **unchanged**.
- **Solution / Workaround:** Never call the default export's `sanitize` directly. Create an instance lazily with `DOMPurify(window)` at call time and check `isSupported`, falling back to HTML-escaping (see `getPurifier()` in `packages/core/src/index.ts`).

---

### Media `error` event fires before the API's error detail is available

- **Affected Area:** `packages/core` (`createRenderUrlMonitor`), `SlopImage` / `SlopVideo` in `packages/react` and `packages/svelte`
- **Symptoms / Error:** A failed generation (e.g. HTTP 400 "Missing required variable") is reported as a generic "Failed to load image" with no `status`, even though the API returned a detailed JSON error.
- **Root Cause:** The `<img>`/`<video>` element requests the URL directly and fires `error` as soon as it gets a non-media response. The detail can only be read by the separate `HEAD` check plus a follow-up `GET`, which finishes later. Reporting whichever failure arrives first means the generic one usually wins.
- **Solution / Workaround:** Route both failure sources through `createRenderUrlMonitor`. On a media `error` it waits for the shared URL check and reports the API error when there is one, falling back to the generic message. It also reports at most once per URL and drops results for URLs that are no longer current. Don't add a second, independent error path in components.

---

### `@sveltejs/package` 3.x silently upgrades the repo to TypeScript 6

- **Affected Area:** `packages/svelte`, every package's build and type-check
- **Symptoms / Error:** After installing or upgrading `@sveltejs/package`, every `tsup` DTS build and `tsc` run fails with `TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`, and the downstream packages then can't find core's types (`TS7016`). `npm ls typescript` shows `typescript@6.x … invalid`.
- **Root Cause:** `@sveltejs/package` 3.x has a `typescript: ^6.0.0` peer dependency, so npm hoists TypeScript 6 to the root `node_modules`, replacing the 5.9 that the other workspaces use.
- **Solution / Workaround:** Keep `@sveltejs/package` on `^2.5.x` until the repo deliberately moves to TypeScript 6. If it happens, restore `package-lock.json` from `main`, then run `npm install` so TypeScript resolves back to 5.9.

---

### `"use client"` must be added as a tsup banner

- **Affected Area:** `packages/react`
- **Symptoms / Error:** Importing `SlopImage` / `SlopVideo` / `SlopText` from a React Server Component (e.g. a Next.js App Router page) fails the build with `useState is not a function`. A `"use client"` line at the top of a source file has no effect.
- **Root Cause:** esbuild (used by tsup) drops module-level directives when bundling, so `"use client"` written in source never reaches `dist/`.
- **Solution / Workaround:** Add the directive with `banner: { js: '"use client";' }` in `packages/react/tsup.config.ts` (already configured), and check that `dist/index.mjs` and `dist/index.js` start with it. The whole entry is client-only, so server code that needs plain helpers (URL builders, `rateResult`, `SlopMachineError`) should import them from `@slopmachine/core`.
