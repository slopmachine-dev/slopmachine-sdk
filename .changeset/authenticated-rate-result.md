---
"@slopmachine/core": major
"@slopmachine/react": major
"@slopmachine/svelte": major
---

Require `apiKey` in `rateResult` options (`POST /api/results/{resultId}/rating` with `x-api-key`, optional `apiBaseUrl`) and remove `rateResult` re-exports from `@slopmachine/react` and `@slopmachine/svelte` since rating is for server-side use only.
