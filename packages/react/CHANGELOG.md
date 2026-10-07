# @slopmachine/react

## 0.9.0

### Minor Changes

- 56eaf03: Component polish (React and Svelte):

  - **`alt` on `SlopImage`:** describe the image for screen readers (or pass `""` for decorative images). The default text is unchanged.
  - **`objectFit` on `SlopVideo`:** matches `SlopImage`; defaults to `"cover"`.
  - **`SlopText` error handling** now matches `SlopImage`/`SlopVideo`:
    - a default "Failed to load text" message instead of an empty element;
    - `onGenerationError(error)`;
    - errors are `SlopMachineError` with the API's message and HTTP `status`;
    - React's `errorFallback` also accepts `(error) => node`.
  - **Stale text fix:** `SlopText` cancels in-flight requests when its props change, so a slow response can no longer replace newer text. This affected Svelte.
  - **Theming:** the loader, shimmer and error states read new `--slop-muted`, `--slop-muted-foreground` and `--slop-shimmer` CSS variables. These fall back to `--muted`/`--muted-foreground`, so the default look is unchanged; set them to style the components independently, or to fix themes whose `--muted` isn't a plain colour.
  - **Svelte now matches React:**
    - `SlopImage`/`SlopVideo` render the media URL immediately, including when server-rendering (previously an empty `src` for 50 ms);
    - later prop changes are debounced by 100 ms, as in React;
    - `SlopText` bypasses the HTTP cache, as React already did;
    - `SlopTextProps` is now exported.
  - **Core:** new `fetchRenderedText(url, { signal })`, shared by both `SlopText` components.

### Patch Changes

- Updated dependencies [56eaf03]
  - @slopmachine/core@0.9.0

## 0.8.1

### Patch Changes

- 9e91dd6: - Passing bucket-only options (`model`, `version`, `original`, `attachments`, video `duration`) together with `pipelineId` now logs a one-time console warning. The pipeline endpoint doesn't support them, and they were previously dropped silently. `aspectRatio` still sizes the component and doesn't warn.
  - `interpolatePrompt` now treats variable names and values literally. Keys containing regex characters (e.g. `{a.b}`) no longer match other placeholders, and values containing `$` are no longer mangled.
  - Clarified that `baseUrl` is a full endpoint URL, not a base URL.
  - Internal: the URL builders share one implementation. Generated URLs are byte-for-byte unchanged, so existing browser and CDN caches stay valid.
- Updated dependencies [9e91dd6]
  - @slopmachine/core@0.8.1

## 0.8.0

### Minor Changes

- 2026601: Packaging fixes:

  - **React Server Components:** `@slopmachine/react` now ships with a `"use client"` directive, so `SlopImage`, `SlopVideo` and `SlopText` can be imported directly from Next.js App Router server components (this previously failed with `useState is not a function`). Server code that needs plain helpers should import them from `@slopmachine/core`.
  - **Smaller installs:** `@slopmachine/core` no longer depends on `@pixerate/schemas` (and transitively `zod`). `ImageAspectRatio` and `VideoAspectRatio` are now defined inline with the same values.
  - **Svelte package is now built** with `@sveltejs/package`: components still ship as uncompiled `.svelte` files, but the entry point is plain JS with generated `.d.ts` types, so non-Vite tooling works and consumers' TypeScript no longer type-checks the SDK's source.
  - **Published files:** packages now publish only `dist/` and `CHANGELOG.md` (previously source, tsconfig and internal docs were included). Core and React are marked `sideEffects: false` for better tree-shaking.
  - **ESM types:** core and React now expose separate type declarations for `import` (`.d.mts`) and `require` (`.d.ts`), fixing ambiguous types for ESM consumers.

### Patch Changes

- Updated dependencies [2026601]
  - @slopmachine/core@0.8.0

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

### Patch Changes

- Updated dependencies [2644625]
  - @slopmachine/core@0.7.0

## 0.6.0

### Minor Changes

- 07c4435: - **Security:** `SlopText` now sanitizes rendered Markdown with DOMPurify, closing an XSS vector where generated text (steerable via user-supplied prompts or variables) could inject scripts or event handlers. During SSR, text is rendered HTML-escaped. The logic lives in a new core export, `renderMarkdown`.
  - Add the `model` option to `SlopImage`, `SlopText`, `buildImageUrl` and `buildTextUrl`. It was documented but never sent to the API.
  - Export `preloadVideo` and `preloadText` from `@slopmachine/react` and `@slopmachine/svelte` (as documented), and the `SlopTextOptions` type from `@slopmachine/react`.
  - `@slopmachine/react` now declares `react` as a peer dependency and no longer installs unused runtime dependencies (Radix UI, lucide-react, shiki, Tailwind plugins, class-variance-authority, @types/marked).

### Patch Changes

- Updated dependencies [07c4435]
  - @slopmachine/core@0.6.0

## 0.5.0

### Minor Changes

- 119e423: Add `rateResult` function to allow rating generated results as good, bad, or clearing their rating.

### Patch Changes

- Updated dependencies [119e423]
  - @slopmachine/core@0.5.0

## 0.4.0

### Minor Changes

- 25bf4d8: Remove quality prop and query parameter across SDK and components.

### Patch Changes

- Updated dependencies [25bf4d8]
  - @slopmachine/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [fbdeaec]
  - @slopmachine/core@0.3.0

## 0.2.0

### Minor Changes

- 15b923d: Switch pipeline execution parameters to use pipelineId (with optional siloId) instead of pipelineKey.

### Patch Changes

- Updated dependencies [15b923d]
  - @slopmachine/core@0.2.0
