---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

Add error states to `SlopImage` and `SlopVideo` (React and Svelte).

- When generation or loading fails, the media slot now shows a default error message instead of a broken image or empty video, keeping the layout intact. The failed element is hidden from assistive technology.
- New `errorFallback` prop (React: node or `(error) => node`; Svelte: snippet receiving `{ error }`) to customise the error UI.
- New `onGenerationError(error)` callback, called once per URL.
- Errors are `SlopMachineError` instances (exported from all three packages) carrying the API's error message and HTTP `status` when the API rejected the request.
- Fixed: a stale URL check could affect the loading state after props changed (React had no request cancellation). Network/CORS failures of the HEAD check no longer end the loading state early; the media element's own load/error events decide.
- Svelte components no longer render an empty `src` attribute before the URL is ready.
- Core: new `SlopMachineError`, `checkRenderUrl()` and `createRenderUrlMonitor()` exports.
