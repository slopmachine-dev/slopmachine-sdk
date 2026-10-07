# @slopmachine/svelte

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
