---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

Forward `version`, `aspectRatio`, `duration`, and `attachments` in `pipelineId` mode (`buildImageUrl`, `buildVideoUrl`, `buildTextUrl`, `buildPipelineUrl`, and `executePipeline`), stop warning on those supported pipeline options in `warnIgnoredPipelineOptions`, enrich `PipelineResult` with `steps` (`mapStepResults`) keyed by `stepId` and `outputKey`, and add `useSlopPipeline` (React) and `createSlopPipeline` (Svelte) for declarative multi-output pipeline consumption, both with `refetch(overrideOptions)` for one-off overrides.

Pipeline-only values are kept out of bucket URLs: with `bucketId`, per-step `Record<stepId, …>` maps for `aspectRatio`, `duration` and `attachments` (plus `SlopText`'s `aspectRatio`/`duration` and `SlopImage`'s `duration`) are dropped with a one-time console warning. URLs for existing bucket inputs are unchanged. Adds `resolveCssAspectRatio` to core, shared by the React and Svelte media components.

**Behaviour change for pipeline users:** `aspectRatio` used to be layout-only with `pipelineId` (it sized the container and was not sent to the API). It is now also sent as a pipeline override. Any existing `<SlopImage pipelineId aspectRatio="…">` / `<SlopVideo pipelineId aspectRatio="…">` (or `buildImageUrl`/`buildVideoUrl`/`buildPipelineUrl` calls passing `aspectRatio` with `pipelineId`) gets a new URL, which bypasses existing browser and CDN caches and may produce a different result. Remove `aspectRatio` from the call if you only used it for layout and want the previous URLs.
