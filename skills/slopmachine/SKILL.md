---
name: slopmachine
description: End-to-end guide for autonomous agents to authenticate with Slop Machine (remote MCP, device-code /connect handshake, WebMCP), manage workspaces (silos) and prompt templates, author and execute multi-step AI media pipelines (video, image, audio, speech, music, vector, animation, text, JSON), monitor fuel costs, and integrate @slopmachine/react, @slopmachine/svelte, and @slopmachine/core into applications without needing the web UI.
---

# Slop Machine Agent Skill

Use this skill to operate **Slop Machine** (`https://slopmachine.dev`) end-to-end without the web studio UI: onboarding users via device-code claim links, configuring the remote MCP server, authoring multi-step generative pipelines, executing runs, polling results, and wiring `<SlopImage />`, `<SlopVideo />`, and `<SlopText />` into React or Svelte codebases.

For complete step configuration schemas, supported aspect ratios, durations, and fuel cost formulas across all pipeline step types, read [`references/step-types.md`](./references/step-types.md).

---

## 1. Onboarding & Authentication

Slop Machine supports three authentication paths depending on whether the user already has an API key (`slop_live_...`), needs to sign up / log in from the agent, or is running an in-browser agent.

### A. One-Line CLI Bootstrap (Recommended)

Run the built-in CLI helper to authenticate (via device-code browser claim or `--api-key`), configure MCP for your agent host, and install this skill into the workspace:

```bash
# Interactive device-code login + MCP config + skill install
npx @slopmachine/core init

# Or pass an existing API key non-interactively
npx @slopmachine/core init --api-key slop_live_YOUR_API_KEY
```

You can also install the skill directly via the `skills` CLI:

```bash
npx skills add slopmachine-dev/slopmachine-sdk
```

### B. Agent-Initiated Device-Code Signup / Login Handshake (`/connect`)

If the user does not have a Slop Machine account or API key yet, **initiate the device-code handshake on their behalf** instead of asking them to manually navigate account settings:

1. **Start the handshake** (unauthenticated `POST`):
   ```bash
   curl -s -X POST https://slopmachine.dev/api/auth/agent-handshake \
     -H "Content-Type: application/json" \
     -d '{
       "agentName": "Coding Agent",
       "clientSource": "cli",
       "scopes": ["mcp", "pipelines:read", "pipelines:write"]
     }'
   ```
   **Response:**
   ```json
   {
     "deviceCode": "pix_dev_...",
     "userCode": "SLOP-4829",
     "verificationUri": "https://slopmachine.dev/connect?code=SLOP-4829",
     "expiresAt": "2026-11-15T23:30:00.000Z"
   }
   ```

2. **Present the claim link to the user**:
   Show the user `verificationUri` (`https://slopmachine.dev/connect?code=SLOP-4829`) and `userCode`. When the user opens the link and clicks **Approve & Connect Agent** (signing in with Google if needed), Slop Machine automatically provisions their user profile, default team workspace, and initial free Fuel allocation (`200` Fuel), and mints a `slop_live_...` API key.

3. **Poll for redemption** every 3–5 seconds until approved:
   ```bash
   curl -s -X POST https://slopmachine.dev/api/auth/agent-handshake/redeem \
     -H "Content-Type: application/json" \
     -d '{"deviceCode": "pix_dev_..."}'
   ```
   - While waiting: `{ "status": "pending" }`
   - Once approved (returned **once**):
     ```json
     {
       "status": "approved",
       "rawKey": "slop_live_...",
       "apiKeyId": "key_..."
     }
     ```
   - Terminal states: `"expired"` or `"denied"` (start a new handshake if needed).

### C. Remote MCP Server Configuration (`https://slopmachine.dev/api/mcp`)

Slop Machine hosts a streamable HTTP MCP server at `https://slopmachine.dev/api/mcp`. Authenticate with `Authorization: Bearer slop_live_...` (or `x-api-key: slop_live_...`).

- **Claude Code**:
  ```bash
  claude mcp add --transport http slopmachine "https://slopmachine.dev/api/mcp" \
    --header "Authorization: Bearer slop_live_YOUR_API_KEY"
  ```
- **Antigravity (`agy`)**:
  ```bash
  agy mcp add --transport http slopmachine "https://slopmachine.dev/api/mcp" \
    --header "Authorization: Bearer slop_live_YOUR_API_KEY"
  ```
- **Cursor (`.cursor/mcp.json`) / Workspace (`.mcp.json`)**:
  ```json
  {
    "mcpServers": {
      "slopmachine": {
        "type": "http",
        "url": "https://slopmachine.dev/api/mcp",
        "headers": {
          "Authorization": "Bearer slop_live_YOUR_API_KEY"
        }
      }
    }
  }
  ```
- **Claude Desktop (`claude_desktop_config.json`)**:
  ```json
  {
    "mcpServers": {
      "slopmachine": {
        "url": "https://slopmachine.dev/api/mcp",
        "headers": {
          "Authorization": "Bearer slop_live_YOUR_API_KEY"
        }
      }
    }
  }
  ```

### D. In-Browser WebMCP (`document.modelContext`)

When operating inside an authenticated browser tab on `https://slopmachine.dev`, Slop Machine registers WebMCP tools directly on `document.modelContext` (via `@mcp-b/global`):
- `list_silos`: List accessible workspaces for the signed-in user.
- `list_pipelines`: List pipelines in the active or specified `siloId`.
- `create_pipeline`: Create a new pipeline (`title`, `description`, `siloId`, `defaultResultType`).
- `execute_pipeline`: Trigger generation (`pipelineId`, `siloId`, `variables`, `count`).
- `create_api_key`: Mint a new `slop_live_...` key for remote MCP use.

---

## 2. Core Domain & Pipeline Authoring Mental Model

### Entities
- **Silo (`siloId`)**: A collaborative workspace scoped to a brand, project, or app. Holds Pipelines, Buckets, and shared Templates. If `siloId` is omitted when creating a pipeline via MCP, Slop Machine resolves the user's writable silo or auto-creates an `"Agent Workspace"` silo.
- **Pipeline (`pipelineId`)**: A multi-step generative workflow (e.g., `text_generation` &rarr; `video_generation` &rarr; `video_compositing`). Accepts runtime `prompt`, `variables`, `aspectRatio`, `duration`, `attachments`, and `metadata`.
- **Version (`version`)**: Each pipeline maintains numbered versions (`1`, `2`, ...) holding an immutable `steps` array and cache expiration policy (`expiresAfter`). `currentVersion` points to the default active version.
- **Bucket (`bucketId`)**: A single-step, pre-templated prompt asset with optional discrete variable constraints (`constraints: { [var]: { type: "set", values: [...] } }`).
- **Template (`{{template_name}}`)**: A reusable, versioned prompt fragment stored at the Silo level (e.g., a shared brand style guide or negative prompt).

### Variable & Template Syntax Guardrails (CRITICAL)

| Syntax | Meaning | Where Used | Example |
| :--- | :--- | :--- | :--- |
| **`{variable_name}`** (single braces) | **Runtime variable** or **upstream step output** (`outputKey` / `json_generation` field key) | Step `config.prompt`, `config.systemPrompt`, Bucket prompts, SDK `variables` prop | `"A neon sign in {city} saying {headline}"` |
| **`{{template_name}}`** (double braces) | **Silo prompt template reference** (expanded at runtime up to 10 levels deep) | Step `config.prompt`, `config.systemPrompt`, or inside another Template body | `"{{brand_style}} A portrait of {subject}"` |

> **Guardrail**: Never use double braces `{{var}}` for runtime variables or step outputs—`{{...}}` exclusively resolves Silo Templates created via `create_template`. Always use single braces `{var}` for runtime inputs and step chaining.

### Result Shelf Life (`expiresAfter`)
Configured on `create_pipeline` or `update_pipeline`:
- `{ "type": "forever" }` (default): Cached results for identical inputs never expire unless deleted or rated `"bad"`. Cache hits cost **0 Fuel**.
- `{ "type": "never" }`: Regenerates on every request (5-minute deduplication window).
- `{ "type": "custom", "amount": 24, "unit": "hours" }`: Expires after `minutes`, `hours`, `days`, or `weeks`.

---

## 3. MCP Tools Reference

### Workspace & Account Tools
- **`list_silos`**: Lists accessible workspaces (`id`, `title`, `description`).
- **`create_silo`** *(when available)*: Creates a new workspace (`title`, `description`). Note: `create_pipeline` also auto-provisions an `"Agent Workspace"` silo if the user has none.
- **`get_fuel_balance`** *(when available)*: Returns the active team's `fuelBalance`, `planId`, billing cycle info, step cost reference, and top-up URL (`https://slopmachine.dev/pricing`).

### Pipeline Lifecycle Tools
- **`list_pipelines`**: Lists pipelines (`siloId?`). Returns `id`, `title`, `description`, `siloId`, `currentVersion`, `resultCount`, `defaultResultType`.
- **`get_pipeline`**: Returns `{ pipeline, version }` including the full `steps` array (`pipelineId`, `siloId?`). Always call `get_pipeline` before `update_pipeline` when modifying steps so you send the complete updated `steps` array.
- **`create_pipeline`**: Creates a new pipeline.
  - Parameters:
    - `title` (`string`, required)
    - `description` (`string`, optional)
    - `siloId` (`string`, optional)
    - `defaultResultType` (`"video" | "image" | "text" | "audio" | "vector" | "animation"`, optional, default `"video"`)
    - `steps` (`PipelineStepInput[]`, optional)
    - `expiresAfter` (`DurationValue`, optional)
    - `whitelistedDomains` (`string[]`, optional)
- **`update_pipeline`**: Updates an existing pipeline and/or its version in place.
  - Parameters: `pipelineId` (required), `siloId?`, `version?`, `title?`, `description?`, `defaultResultType?`, `steps?` (full replacement list of steps for the version), `expiresAfter?`, `whitelistedDomains?`.
- **`execute_pipeline`**: Enqueues `1` to `10` pipeline runs (`count`) and returns `resultIds`.
  - Parameters:
    - `pipelineId` (`string`, required)
    - `siloId` (`string`, optional)
    - `version` (`number`, optional)
    - `variables` (`Record<string, any>`, optional) — values for `{variable}` placeholders
    - `attachments` (`Record<string, string[]>`, optional) — runtime attachment URLs keyed by `stepId` (requires `allowRuntimeAttachments: true` on the step)
    - `aspectRatio` (`Record<string, string>`, optional) — runtime aspect ratio overrides keyed by `stepId` (requires `allowRuntimeAspectRatio: true` on the step)
    - `duration` (`Record<string, number>`, optional) — runtime duration overrides in seconds keyed by `stepId` (requires `allowRuntimeDuration: true` on the step)
    - `count` (`number`, 1–10, default `1`)
- **`get_pipeline_result`**: Polls execution status and output URLs for a `resultId` (`resultId`, `siloId?`, `pipelineId?`, `version?`).
  - Status values: `"queued"` &rarr; `"processing"` &rarr; `"completed"` or `"failed"`.
  - When `"completed"`, inspect `url` (or `cdnUrl` / `optimizedUrl`), `content` / `data` (for text/JSON), and `stepResults[]`.

### Silo Prompt Template Tools
- **`list_templates`**: Lists all reusable `{{template_name}}` fragments in a `siloId`.
- **`create_template`**: Creates a template (`siloId`, `name` without braces, `body`, `title?`, `color?`).
- **`update_template`**: Updates a template (`siloId`, `templateId`, `name?`, `body?`, `title?`, `color?`). Updating `body` creates a new template version that pipelines automatically use on their next run.

### Scheduling & Review Queue Tools
- **`create_schedule`**: Creates a recurring 5-field cron schedule (`pipelineId`, `siloId?`, `cron` min 1-hour interval e.g. `"0 9 * * *"`, `timezone?` IANA default `"UTC"`, `version?`, `variables?`, `count?` 1–10, `review?`, `enabled?`).
- **`list_schedules`**: Lists schedules for a `pipelineId` (`pipelineId`, `siloId?`).
- **`update_schedule`**: Updates or enables/disables a schedule (`pipelineId`, `scheduleId`, `siloId?`, `cron?`, `timezone?`, `version?`, `variables?`, `count?`, `review?`, `enabled?`).
- **`list_pending_reviews`**: Lists scheduled results awaiting human review (`siloId`, `pipelineId?`, `limit?`), including AI batch selection rankings (`review.aiRank`, `review.aiReason`).

---

## 4. Pipeline Step Chaining & Fuel Costs

Each step in `steps` has the shape:

```json
{
  "id": "step_1",
  "name": "Generate Scene Image",
  "type": "image_generation",
  "outputKey": "sceneImage",
  "allowRuntimeAspectRatio": true,
  "config": {
    "prompt": "{{brand_style}} A cinematic wide shot of {location} at dusk",
    "aspectRatio": "16:9",
    "quality": "fast"
  }
}
```

### Step Chaining Rules
1. **Sequential Default**: By default, step $N$ receives the primary output (media URL or text) of step $N-1$ as its input attachment/context.
2. **Named Outputs (`outputKey` & `inputKey`)**:
   - Set `"outputKey": "researchBrief"` on an upstream step to reference its text output in any downstream step prompt as `{researchBrief}`.
   - Set `"inputKey": "sceneImage"` on a media-consuming step (e.g. `video_generation`, `image_transformation`, `background_removal`, `flair_effect`) to pull its media input from a specific upstream step rather than the immediately preceding step.
3. **Structured JSON Outputs (`json_generation`)**:
   - Define `config.outputs: [{ key: "headline", instructions: "3-word punchy hook", type: "string" }, { key: "duration", instructions: "Clip length", type: "number" }]`.
   - Every defined `key` is automatically injected into the pipeline variable context so downstream steps can interpolate `{headline}` directly in their `config.prompt`.

### Quick Fuel Cost Reference

| Step Type | Fuel Cost Formula | Default Cost |
| :--- | :--- | :--- |
| `video_generation`, `video_*` | `15 * durationSeconds` Fuel | `60` Fuel (4s) / `120` Fuel (8s) |
| `image_generation`, `image_*`, `background_removal`, `thumbnail_generation` | `6` Fuel flat | `6` Fuel |
| `vector` | `3` Fuel flat | `3` Fuel |
| `animation` | `1 * durationSeconds` Fuel | `4` Fuel (4s) |
| `flair_effect` | `1 * durationSeconds` (SVG/animation), `3` (vector), or `15 * durationSeconds` (video shader) | `4` / `3` / `60` Fuel |
| `speech_generation` | `2` Fuel flat | `2` Fuel |
| `music_generation` | `1 * durationSeconds` Fuel | `15` Fuel (15s) |
| `text_generation`, `text_modification`, `json_generation`, `code_generation`, `document_generation`, `audio_transcription`, `audio_processing` | `1` Fuel flat | `1` Fuel |

See [`references/step-types.md`](./references/step-types.md) for full per-step configuration fields, valid `aspectRatio` values, voice options, and Flair effect parameters.

---

## 5. Zero-UI Workflow Playbooks

### Playbook 1: Create, Execute, and Poll a Multi-Step Pipeline via MCP

1. **Create or inspect workspace**: Call `list_silos` to pick a `siloId` (or let `create_pipeline` use/create the default workspace).
2. **Create the pipeline** (`create_pipeline`):
   ```json
   {
     "title": "Product Launch Reel",
     "description": "Generates copy + 9:16 launch video with runtime product variables",
     "defaultResultType": "video",
     "expiresAfter": { "type": "forever" },
     "steps": [
       {
         "id": "step_copy",
         "name": "Draft Visual Prompt",
         "type": "json_generation",
         "outputKey": "copy",
         "config": {
           "prompt": "Create a visual video prompt and tagline for {productName} aimed at {audience}.",
           "outputs": [
             { "key": "videoPrompt", "instructions": "Detailed cinematic description for video generation", "type": "string" },
             { "key": "tagline", "instructions": "3-5 word overlay headline", "type": "string" }
           ]
         }
       },
       {
         "id": "step_video",
         "name": "Generate Base Video",
         "type": "video_generation",
         "outputKey": "rawVideo",
         "allowRuntimeAspectRatio": true,
         "allowRuntimeDuration": true,
         "config": {
           "prompt": "{videoPrompt}",
           "aspectRatio": "9:16",
           "durationSeconds": 4
         }
       },
       {
         "id": "step_caption",
         "name": "Overlay Tagline",
         "type": "video_compositing",
         "inputKey": "rawVideo",
         "config": {
           "prompt": "{tagline}"
         }
       }
     ]
   }
   ```
3. **Execute with runtime overrides** (`execute_pipeline`):
   ```json
   {
     "pipelineId": "<pipelineId>",
     "siloId": "<siloId>",
     "variables": {
       "productName": "Quantum Espresso Maker",
       "audience": "specialty coffee nerds"
     },
     "aspectRatio": { "step_video": "9:16" },
     "duration": { "step_video": 4 },
     "count": 1
   }
   ```
4. **Poll until completion** (`get_pipeline_result`):
   Pass `resultId` from `execute_pipeline.resultIds[0]`. Poll every 3–5 seconds while `status` is `"queued"` or `"processing"`. When `status === "completed"`, retrieve `url` / `cdnUrl` and `stepResults`.

### Playbook 2: Integrate into React (`@slopmachine/react`)

Install packages:
```bash
npm install @slopmachine/react @slopmachine/core
```

Render a Pipeline or Bucket with built-in shimmer loader, zero layout shift (CLS), and error fallback:

```tsx
import { SlopImage, SlopVideo, SlopText, preloadImage } from "@slopmachine/react";

// Optional: warm cache in route loader or parent effect
preloadImage({
  pipelineId: "pipe_abc123",
  variables: { city: "Tokyo", theme: "cyberpunk" },
});

export function HeroMedia() {
  return (
    <div className="grid gap-6">
      {/* Multi-step Pipeline Image */}
      <SlopImage
        pipelineId="pipe_abc123"
        siloId="silo_xyz"
        variables={{ city: "Tokyo", theme: "cyberpunk" }}
        metadata={{ feature: "hero_banner" }}
        aspectRatio="16:9"
        className="rounded-lg border-2 border-black"
        alt="Tokyo cyberpunk hero banner"
      />

      {/* Multi-step Pipeline Video */}
      <SlopVideo
        pipelineId="pipe_reel_456"
        variables={{ productName: "Quantum Espresso Maker" }}
        aspectRatio="9:16"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Dynamic Markdown Text */}
      <SlopText
        bucketId="bucket_copy_789"
        variables={{ city: "Tokyo" }}
      />
    </div>
  );
}
```

> **Note on Pipeline vs. Bucket Props in SDK Components**:
> When `pipelineId` is passed to `<SlopImage />`, `<SlopVideo />`, or `<SlopText />`, the SDK routes requests to `renderPipeline` (`redirect=true` for media, `sync=true` for text). Bucket-only URL parameters (`model`, `version`, `original`, `attachments`, and top-level `duration`) are ignored on `pipelineId` component URLs—configure models and step durations on the pipeline steps via MCP instead.

### Playbook 3: Integrate into Svelte 5 (`@slopmachine/svelte`)

Install packages:
```bash
npm install @slopmachine/svelte @slopmachine/core
```

`@slopmachine/svelte` uses Svelte 5 runes and snippets (`loader`, `errorFallback`):

```svelte
<script lang="ts">
  import { SlopImage, SlopVideo, SlopText, type SlopMachineError } from "@slopmachine/svelte";

  function handleError(error: SlopMachineError) {
    console.error("Slop Machine error:", error.status, error.message);
  }
</script>

<SlopImage
  pipelineId="pipe_abc123"
  variables={{ city: "Tokyo", theme: "cyberpunk" }}
  aspectRatio="16:9"
  class="rounded-lg border-2 border-black"
  alt="Tokyo cyberpunk hero banner"
  onGenerationError={handleError}
>
  {#snippet loader()}
    <div class="flex h-full items-center justify-center">Generating scene...</div>
  {/snippet}
  {#snippet errorFallback({ error })}
    <p>Generation failed: {error.message}</p>
  {/snippet}
</SlopImage>

<SlopVideo
  pipelineId="pipe_reel_456"
  variables={{ productName: "Quantum Espresso Maker" }}
  aspectRatio="9:16"
/>

<SlopText bucketId="bucket_copy_789" variables={{ city: "Tokyo" }} />
```

### Playbook 4: Programmatic Execution, Attachments & Rating (`@slopmachine/core`)

Use `@slopmachine/core` in Node.js backends, API routes, or custom frameworks:

```typescript
import {
  executePipeline,
  buildImageUrl,
  buildVideoUrl,
  buildPipelineUrl,
  uploadTempAttachment,
  rateResult,
} from "@slopmachine/core";

// 1. Execute a pipeline synchronously and inspect per-step results & fuel cost
const result = await executePipeline({
  pipelineId: "pipe_abc123",
  siloId: "silo_xyz",
  prompt: "A futuristic rooftop garden in Seoul",
  variables: { season: "autumn" },
  metadata: { requestId: "req_01" },
});
console.log(result.url, result.totalFuelCost, result.stepResults);

// 2. Upload a temporary base64 attachment for generation
const { url: attachmentUrl } = await uploadTempAttachment(base64Data, "image/png");

// 3. Rate a result (Server-side only — requires slop_live_... API key)
// Rating "bad" immediately evicts the result from public L1/L2 caches so the next request regenerates it.
await rateResult(result.id, "bad", {
  apiKey: process.env.SLOPMACHINE_API_KEY!,
});
```
