---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

Component polish (React and Svelte):

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
