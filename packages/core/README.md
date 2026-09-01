# @slopmachine/core

The core logic, URL builders, preloader utilities, and type definitions for the Slop Machine SDK.

## Installation

```bash
npm install @slopmachine/core
# or
yarn add @slopmachine/core
# or
pnpm add @slopmachine/core
```

## Features

- **URL Builders**: `buildImageUrl`, `buildVideoUrl`, `buildTextUrl`, and `buildPipelineUrl` for safe, deterministic API URL generation.
- **Preloaders**: `preloadImage`, `preloadVideo`, and `preloadText` to cache assets ahead of time in client applications.
- **Multi-Step Pipelines**: Programmatic execution via `executePipeline({ pipelineId, prompt, variables, metadata })`.
- **Buckets & Pipelines Support**: Seamlessly switch between pre-templated Buckets and dynamic runtime Pipelines.

## Programmatic Pipeline Execution

```typescript
import { executePipeline } from "@slopmachine/core";

const result = await executePipeline({
  pipelineId: "pipe_live_abc123",
  prompt: "A cinematic tracking shot through a cyberpunk alleyway",
  metadata: { userId: "usr_42" },
});

console.log("Output URL:", result.url);
console.log("Fuel Cost:", result.totalFuelCost);
console.log("Steps executed:", result.stepResults.length);
```

## License

MIT
