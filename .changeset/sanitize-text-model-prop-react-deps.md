---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

- **Security:** `SlopText` now sanitizes rendered Markdown with DOMPurify, closing an XSS vector where generated text (steerable via user-supplied prompts or variables) could inject scripts or event handlers. During SSR, text is rendered HTML-escaped. The logic lives in a new core export, `renderMarkdown`.
- Add the `model` option to `SlopImage`, `SlopText`, `buildImageUrl` and `buildTextUrl`. It was documented but never sent to the API.
- Export `preloadVideo` and `preloadText` from `@slopmachine/react` and `@slopmachine/svelte` (as documented), and the `SlopTextOptions` type from `@slopmachine/react`.
- `@slopmachine/react` now declares `react` as a peer dependency and no longer installs unused runtime dependencies (Radix UI, lucide-react, shiki, Tailwind plugins, class-variance-authority, @types/marked).
