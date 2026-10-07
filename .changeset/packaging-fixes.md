---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

Packaging fixes:

- **React Server Components:** `@slopmachine/react` now ships with a `"use client"` directive, so `SlopImage`, `SlopVideo` and `SlopText` can be imported directly from Next.js App Router server components (this previously failed with `useState is not a function`). Server code that needs plain helpers should import them from `@slopmachine/core`.
- **Smaller installs:** `@slopmachine/core` no longer depends on `@pixerate/schemas` (and transitively `zod`). `ImageAspectRatio` and `VideoAspectRatio` are now defined inline with the same values.
- **Svelte package is now built** with `@sveltejs/package`: components still ship as uncompiled `.svelte` files, but the entry point is plain JS with generated `.d.ts` types, so non-Vite tooling works and consumers' TypeScript no longer type-checks the SDK's source.
- **Published files:** packages now publish only `dist/` and `CHANGELOG.md` (previously source, tsconfig and internal docs were included). Core and React are marked `sideEffects: false` for better tree-shaking.
- **ESM types:** core and React now expose separate type declarations for `import` (`.d.mts`) and `require` (`.d.ts`), fixing ambiguous types for ESM consumers.
