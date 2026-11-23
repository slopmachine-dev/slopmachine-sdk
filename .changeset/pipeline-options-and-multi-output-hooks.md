---
"@slopmachine/core": minor
"@slopmachine/react": minor
"@slopmachine/svelte": minor
---

Forward `version`, `aspectRatio`, `duration`, and `attachments` in `pipelineId` mode (`buildImageUrl`, `buildVideoUrl`, `buildTextUrl`, `buildPipelineUrl`, and `executePipeline`), stop warning on those supported pipeline options in `warnIgnoredPipelineOptions`, enrich `PipelineResult` with `steps` (`mapStepResults`) keyed by `stepId` and `outputKey`, and add `useSlopPipeline` (React) and `createSlopPipeline` (Svelte) for declarative multi-output pipeline consumption.
