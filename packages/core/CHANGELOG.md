# @slopmachine/core

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
