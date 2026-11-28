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
- **Result Rating (Server-Side)**: Rate generated outputs via `rateResult(resultId, rating, { apiKey })`.
- **Buckets & Pipelines Support**: Seamlessly switch between pre-templated Buckets and dynamic runtime Pipelines.
- **CLI Onboarding (`init` / `login`)**: Authenticate via `/connect`, configure the Slop Machine remote MCP server, and install the open-source Agent Skill in one command (`npx @slopmachine/core init`).

## Agent Skill & CLI Bootstrap

```bash
# Interactive device-code login (/connect), MCP setup, and skill installation
npx @slopmachine/core init

# Non-interactive setup with an existing API key (read from the environment)
export SLOPMACHINE_API_KEY=slop_live_YOUR_API_KEY
npx @slopmachine/core init
```

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

## Rating Results (Server-Side Only)

`rateResult` requires a Slop Machine API key (`apiKey`) and must only be called from server-side code (never expose your API key in the browser):

```typescript
import { rateResult } from "@slopmachine/core";

await rateResult("res_123456", "good", {
  apiKey: process.env.SLOPMACHINE_API_KEY!,
});
```

## License

MIT
