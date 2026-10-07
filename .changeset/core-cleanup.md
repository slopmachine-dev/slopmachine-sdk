---
"@slopmachine/core": patch
"@slopmachine/react": patch
"@slopmachine/svelte": patch
---

- Passing bucket-only options (`model`, `version`, `original`, `attachments`, video `duration`) together with `pipelineId` now logs a one-time console warning. The pipeline endpoint doesn't support them, and they were previously dropped silently. `aspectRatio` still sizes the component and doesn't warn.
- `interpolatePrompt` now treats variable names and values literally. Keys containing regex characters (e.g. `{a.b}`) no longer match other placeholders, and values containing `$` are no longer mangled.
- Clarified that `baseUrl` is a full endpoint URL, not a base URL.
- Internal: the URL builders share one implementation. Generated URLs are byte-for-byte unchanged, so existing browser and CDN caches stay valid.
