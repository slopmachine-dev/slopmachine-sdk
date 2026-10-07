# @slopmachine/core

## 0.8.1

### Patch Changes

- 9e91dd6: - Passing bucket-only options (`model`, `version`, `original`, `attachments`, video `duration`) together with `pipelineId` now logs a one-time console warning. The pipeline endpoint doesn't support them, and they were previously dropped silently. `aspectRatio` still sizes the component and doesn't warn.
  - `interpolatePrompt` now treats variable names and values literally. Keys containing regex characters (e.g. `{a.b}`) no longer match other placeholders, and values containing `$` are no longer mangled.
  - Clarified that `baseUrl` is a full endpoint URL, not a base URL.
  - Internal: the URL builders share one implementation. Generated URLs are byte-for-byte unchanged, so existing browser and CDN caches stay valid.

## 0.8.0

### Minor Changes

- 2026601: Packaging fixes:

  - **React Server Components:** `@slopmachine/react` now ships with a `"use client"` directive, so `SlopImage`, `SlopVideo` and `SlopText` can be imported directly from Next.js App Router server components (this previously failed with `useState is not a function`). Server code that needs plain helpers should import them from `@slopmachine/core`.
  - **Smaller installs:** `@slopmachine/core` no longer depends on `@pixerate/schemas` (and transitively `zod`). `ImageAspectRatio` and `VideoAspectRatio` are now defined inline with the same values.
  - **Svelte package is now built** with `@sveltejs/package`: components still ship as uncompiled `.svelte` files, but the entry point is plain JS with generated `.d.ts` types, so non-Vite tooling works and consumers' TypeScript no longer type-checks the SDK's source.
  - **Published files:** packages now publish only `dist/` and `CHANGELOG.md` (previously source, tsconfig and internal docs were included). Core and React are marked `sideEffects: false` for better tree-shaking.
  - **ESM types:** core and React now expose separate type declarations for `import` (`.d.mts`) and `require` (`.d.ts`), fixing ambiguous types for ESM consumers.

## 0.7.0

### Minor Changes

- 2644625: Add error states to `SlopImage` and `SlopVideo` (React and Svelte).

  - When generation or loading fails, the media slot now shows a default error message instead of a broken image or empty video, keeping the layout intact. The failed element is hidden from assistive technology.
  - New `errorFallback` prop (React: node or `(error) => node`; Svelte: snippet receiving `{ error }`) to customise the error UI.
  - New `onGenerationError(error)` callback, called once per URL.
  - Errors are `SlopMachineError` instances (exported from all three packages) carrying the API's error message and HTTP `status` when the API rejected the request.
  - Fixed: a stale URL check could affect the loading state after props changed (React had no request cancellation). Network/CORS failures of the HEAD check no longer end the loading state early; the media element's own load/error events decide.
  - Svelte components no longer render an empty `src` attribute before the URL is ready.
  - Core: new `SlopMachineError`, `checkRenderUrl()` and `createRenderUrlMonitor()` exports.

## 0.6.0

### Minor Changes

- 07c4435: - **Security:** `SlopText` now sanitizes rendered Markdown with DOMPurify, closing an XSS vector where generated text (steerable via user-supplied prompts or variables) could inject scripts or event handlers. During SSR, text is rendered HTML-escaped. The logic lives in a new core export, `renderMarkdown`.
  - Add the `model` option to `SlopImage`, `SlopText`, `buildImageUrl` and `buildTextUrl`. It was documented but never sent to the API.
  - Export `preloadVideo` and `preloadText` from `@slopmachine/react` and `@slopmachine/svelte` (as documented), and the `SlopTextOptions` type from `@slopmachine/react`.
  - `@slopmachine/react` now declares `react` as a peer dependency and no longer installs unused runtime dependencies (Radix UI, lucide-react, shiki, Tailwind plugins, class-variance-authority, @types/marked).

## 0.5.0

### Minor Changes

- 119e423: Add `rateResult` function to allow rating generated results as good, bad, or clearing their rating.

## 0.4.0

### Minor Changes

- 25bf4d8: Remove quality prop and query parameter across SDK and components.

## 0.3.0

### Minor Changes

- fbdeaec: Omit default duration in buildVideoUrl so requests fall back to the bucket version's configured duration on the server

## 0.2.0

### Minor Changes

- 15b923d: Switch pipeline execution parameters to use pipelineId (with optional siloId) instead of pipelineKey.
