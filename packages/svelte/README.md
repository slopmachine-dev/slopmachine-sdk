# @slopmachine/svelte

The official Svelte SDK for Slop Machine. Easily integrate Slop Machine image, video, and text generation into your Svelte 5 applications.

## Installation

```bash
npm install @slopmachine/svelte @slopmachine/core
# or
yarn add @slopmachine/svelte @slopmachine/core
# or
pnpm add @slopmachine/svelte @slopmachine/core
```

## Demo

https://docs.slopmachine.dev/demo-svelte/

## Usage

### 1. Using Pre-Templated Buckets

```svelte
<script lang="ts">
  import { SlopImage, SlopVideo, SlopText } from "@slopmachine/svelte";
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <SlopImage
    bucketId="my-bucket-id"
    aspectRatio="1:1"
    variables={{ style: "realistic", character: "owl" }}
    class="rounded-lg shadow"
  />

  <SlopVideo
    bucketId="my-video-bucket"
    aspectRatio="16:9"
    duration={4}
    autoplay
    loop
    muted
  />

  <SlopText
    bucketId="my-text-bucket"
    variables={{ item: "magical sword" }}
  />
</div>
```

### 2. Using Dynamic Multi-Step Pipelines

Pipelines give developers runtime prompt flexibility and multi-step AI chaining:

```svelte
<script lang="ts">
  import { SlopImage, SlopVideo, SlopText } from "@slopmachine/svelte";
</script>

<div>
  <SlopImage
    pipelineId="pipe_live_abc123"
    prompt="A futuristic neon marketplace in Tokyo at dusk"
    aspectRatio="16:9"
    metadata={{ source: "user-generated-content" }}
  />

  <SlopVideo
    pipelineId="pipe_live_def456"
    prompt="Hyperlapse sunset over Martian red sand dunes"
    aspectRatio="9:16"
  />

  <SlopText
    pipelineId="pipe_live_ghi789"
    prompt="Write an intro paragraph for a sci-fi novel about sentient houseplants"
  />
</div>
```

## License

MIT
