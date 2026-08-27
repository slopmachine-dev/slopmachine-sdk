---
description: Reference documentation for the Slop Machine Render Pipeline API.
---

# Render Pipeline API

The Render Pipeline API is the execution endpoint for multi-step AI pipelines defined in Slop Machine. Unlike Buckets (which are pre-templated and locked down to dynamic variables), Pipelines transfer full runtime control to the developer, allowing dynamic prompts, multi-step chaining (e.g. text generation &rarr; video generation &rarr; audio &rarr; video text compositing), and custom metadata persistence.

Pipelines are secured via secret **Pipeline Keys** (`pipelineKey`), preventing unauthorized executions.

## Endpoint Details

- **Method**: `GET` or `POST`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline`
- **Authentication**: `pipelineKey` passed in query parameters, request body, or `Authorization: Bearer <key>` header.

## Usage in Components (`SlopImage`, `SlopVideo`, `SlopText`)

The React and Svelte components seamlessly support Pipelines by providing the `pipelineKey` and runtime `prompt`:

```tsx
import { SlopImage } from "@slopmachine/react";

<SlopImage
  pipelineKey="pipe_live_abc123"
  prompt="1960s retro robot eating pizza on Mars with a flying pig"
  aspectRatio="16:9"
  metadata={{ userId: "usr_42", campaign: "launch_v1" }}
/>
```

When `pipelineKey` is passed to `<SlopImage>` or `<SlopVideo>`, the SDK automatically appends `redirect=true`, allowing the media tag to transparently redirect to the final rendered asset URL.

## Programmatic Execution (`executePipeline`)

For backend workflows or programmatic client execution returning the full typed execution breakdown:

```typescript
import { executePipeline } from "@slopmachine/core";

const result = await executePipeline({
  pipelineKey: "pipe_live_abc123",
  prompt: "Generate a vibrant summer fashion reel",
  variables: { location: "Tokyo" },
  metadata: { batchId: "b-987" }
});

console.log("Status:", result.status);
console.log("Primary Output URL:", result.url);
console.log("Step Breakdown:", result.stepResults);
console.log("Fuel Cost:", result.totalFuelCost);
console.log("Execution Time (ms):", result.totalComputeTimeMs);
```

## Request Parameters

| Parameter     | Type       | Required | Default   | Description                                                                                             |
| :------------ | :--------- | :------: | :-------- | :------------------------------------------------------------------------------------------------------ |
| `pipelineKey` | `string`   | **Yes**  |           | The secret key identifying and authorizing the pipeline execution.                                      |
| `prompt`      | `string`   |    No    |           | Runtime prompt passed into the pipeline's entry step (e.g., text, image, or video prompt).               |
| `variables`   | `object`   |    No    | `{}`      | Dynamic variables to interpolate into step prompts and configuration templates (`{key}`).                 |
| `metadata`    | `object`   |    No    | `{}`      | Arbitrary key-value metadata to attach to the execution result in Firestore.                            |
| `sync`        | `boolean`  |    No    | `true`    | When `true`, waits for the pipeline execution to complete before returning.                             |
| `redirect`    | `boolean`  |    No    | `false`   | When `true` (and `sync=true`), responds with an HTTP `302 Found` redirect directly to the primary media output. |
| `resultId`    | `string`   |    No    |           | If provided, returns the cached result of a previously executed pipeline.                               |

## Response Schema (`PipelineResult`)

```typescript
interface PipelineResult {
  id: string;
  pipelineId: string;
  siloId: string;
  url?: string;
  text?: string;
  data?: any;
  resultType: string; // "image" | "video" | "text" | "audio" | "composite" | "unknown"
  status: "completed" | "failed" | "pending";
  stepResults: Array<{
    stepId: string;
    stepName?: string;
    type: string;
    outputUrl?: string;
    outputText?: string;
    outputData?: any;
    computeTimeMs?: number;
    fuelCost?: number;
    error?: string;
  }>;
  totalComputeTimeMs: number;
  totalFuelCost: number;
  metadata?: Record<string, any>;
  timestamp: any;
  error?: string;
}
```
