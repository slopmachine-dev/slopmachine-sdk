---
description: Reference documentation for the Slop Machine Render Pipeline API.
---

# Render Pipeline API

The Render Pipeline API is the execution endpoint for multi-step AI pipelines defined in Slop Machine. Unlike Buckets (which are pre-templated and locked down to dynamic variables), Pipelines transfer full runtime control to the developer, allowing dynamic prompts, multi-step chaining (e.g. text generation &rarr; video generation &rarr; audio &rarr; video text compositing), and custom metadata persistence.

Pipelines are identified by their `pipelineId`.

## Endpoint Details

- **Method**: `GET` or `POST`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline`
- **Identification**: `pipelineId` passed in query parameters or request body.

## Usage in Components (`SlopImage`, `SlopVideo`, `SlopText`)

The React and Svelte components seamlessly support Pipelines by providing the `pipelineId` and runtime `prompt`:

```tsx
import { SlopImage } from "@slopmachine/react";

<SlopImage
  pipelineId="pipe_abc123"
  prompt="1960s retro robot eating pizza on Mars with a flying pig"
  version={3}
  aspectRatio="16:9"
  attachments={["https://cdn.example.com/reference.png"]}
  metadata={{ userId: "usr_42", campaign: "launch_v1" }}
/>
```

When `pipelineId` is passed to `<SlopImage>` or `<SlopVideo>`, the SDK automatically appends `redirect=true`, allowing the media tag to transparently redirect to the final rendered asset URL.

Pipelines support forwarding `version` (for git-tracked version pinning), `aspectRatio` (either a single aspect ratio string or a per-step `Record<stepId, AspectRatio>` map), `duration` (`number` or `Record<stepId, number>`), and `attachments` (`string[]` or `Record<stepId, string[]>`). Bucket-only options (`model` and `original`) aren't supported by the pipeline endpoint: they're left out of the request and the SDK logs a one-time console warning. The reverse also holds: per-step `Record<stepId, …>` maps (and `aspectRatio`/`duration` on `SlopText`) only apply to pipelines, so with `bucketId` they're left out of the request with a one-time console warning.

## Multi-Output Pipelines (`useSlopPipeline` & `createSlopPipeline`)

When a multi-step pipeline produces multiple distinct outputs across steps (for example: Step 1 `json_generation` producing `{ headline, seoDescription }`, Step 2 `video_generation` producing a hero MP4, and Step 3 `thumbnail_generation` producing a poster WebP), use `useSlopPipeline` in React or `createSlopPipeline` in Svelte to consume every step output declaratively via `steps` keyed by `stepId` or `outputKey`:

### React (`useSlopPipeline`)

```tsx
import { useSlopPipeline } from "@slopmachine/react";

function CampaignHero() {
  const { data, steps, isLoading, error, refetch } = useSlopPipeline({
    pipelineId: "pipe_abc123",
    prompt: "Generate a vibrant summer fashion reel",
    version: 3,
    aspectRatio: { heroVideo: "16:9", poster: "16:9" },
    duration: { heroVideo: 6 },
    variables: { location: "Tokyo" },
  });

  if (isLoading) return <div>Generating campaign...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <section>
      <h1>{steps.brief?.outputData?.headline}</h1>
      <p>{steps.brief?.outputData?.seoDescription}</p>
      <video
        src={steps.heroVideo?.outputUrl}
        poster={steps.poster?.outputUrl}
        controls
      />
      <button onClick={() => refetch()}>Regenerate</button>
    </section>
  );
}
```

### Svelte 5 (`createSlopPipeline`)

```svelte
<script lang="ts">
  import { createSlopPipeline } from "@slopmachine/svelte";

  let location = $state("Tokyo");

  const pipeline = createSlopPipeline(() => ({
    pipelineId: "pipe_abc123",
    prompt: "Generate a vibrant summer fashion reel",
    version: 3,
    aspectRatio: { heroVideo: "16:9", poster: "16:9" },
    duration: { heroVideo: 6 },
    variables: { location },
  }));
</script>

{#if pipeline.isLoading}
  <div>Generating campaign...</div>
{:else if pipeline.error}
  <div>Error: {pipeline.error.message}</div>
{:else if pipeline.data}
  <section>
    <h1>{pipeline.steps.brief?.outputData?.headline}</h1>
    <video
      src={pipeline.steps.heroVideo?.outputUrl}
      poster={pipeline.steps.poster?.outputUrl}
      controls
    ></video>
    <button onclick={() => pipeline.refetch()}>Regenerate</button>
  </section>
{/if}
```

`refetch()` re-runs the pipeline with the current options. Both helpers also accept partial overrides for a single run, e.g. `refetch({ prompt: "Try a winter reel" })`; the overrides are merged over the current options and don't persist. Requests always go to the production `renderPipeline` endpoint.

## Programmatic Execution (`executePipeline`)

For backend workflows or programmatic client execution returning the full typed execution breakdown (including `result.steps` keyed by `stepId` and `outputKey`):

```typescript
import { executePipeline } from "@slopmachine/core";

const result = await executePipeline({
  pipelineId: "pipe_abc123",
  prompt: "Generate a vibrant summer fashion reel",
  version: 3,
  aspectRatio: { heroVideo: "16:9" },
  duration: { heroVideo: 6 },
  attachments: { heroVideo: ["https://cdn.example.com/ref.png"] },
  variables: { location: "Tokyo" },
  metadata: { batchId: "b-987" }
});

console.log("Status:", result.status);
console.log("Primary Output URL:", result.url);
console.log("Hero Video Step URL:", result.steps?.heroVideo?.outputUrl);
console.log("Brief Step JSON:", result.steps?.brief?.outputData);
console.log("Step Breakdown:", result.stepResults);
console.log("Fuel Cost:", result.totalFuelCost);
console.log("Execution Time (ms):", result.totalComputeTimeMs);
```

## Request Parameters

| Parameter     | Type                                       | Required | Default   | Description                                                                                             |
| :------------ | :----------------------------------------- | :------: | :-------- | :------------------------------------------------------------------------------------------------------ |
| `pipelineId`  | `string`                                   | **Yes**  |           | The ID identifying the pipeline.                                                                        |
| `siloId`      | `string`                                   |    No    |           | Optional Silo ID to optimize direct document lookup.                                                     |
| `prompt`      | `string`                                   |    No    |           | Runtime prompt passed into the pipeline's entry step (e.g., text, image, or video prompt).               |
| `version`     | `number`                                   |    No    |           | Pin execution or retrieval to a specific immutable pipeline version.                                    |
| `aspectRatio` | `AspectRatio \| Record<string, AspectRatio>` |    No    |           | Runtime aspect ratio override (single ratio string or map keyed by `stepId`).                           |
| `duration`    | `number \| Record<string, number>`         |    No    |           | Runtime duration override in seconds (single number or map keyed by `stepId`).                          |
| `attachments` | `string[] \| Record<string, string[]>`     |    No    |           | Runtime attachment URLs (array or map keyed by `stepId` when runtime attachments are enabled).          |
| `variables`   | `object`                                   |    No    | `{}`      | Dynamic variables to interpolate into step prompts and configuration templates (`{key}`).                 |
| `metadata`    | `object`                                   |    No    | `{}`      | Arbitrary key-value metadata to attach to the execution result in Firestore.                            |
| `sync`        | `boolean`                                  |    No    | `true`    | When `true`, waits for the pipeline execution to complete before returning.                             |
| `redirect`    | `boolean`                                  |    No    | `false`   | When `true` (and `sync=true`), responds with an HTTP `302 Found` redirect directly to the primary media output. |
| `resultId`    | `string`                                   |    No    |           | If provided, returns the cached result of a previously executed pipeline.                               |

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
    outputKey?: string;
    type: string;
    outputUrl?: string;
    outputText?: string;
    outputData?: any;
    computeTimeMs?: number;
    fuelCost?: number;
    error?: string;
    warnings?: string[];
  }>;
  steps?: Record<string, PipelineStepResult>;
  totalComputeTimeMs: number;
  totalFuelCost: number;
  metadata?: Record<string, any>;
  timestamp: any;
  error?: string;
}
```
