---
description: Documentation and API reference for the Svelte SlopVideo component.
---

# Svelte `<SlopVideo />`

The `@slopmachine/svelte` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated videos in your Svelte applications.

The Svelte component handles fetching logic, caching, and state transitions, and takes advantage of Svelte 5 snippets for the custom `loader` template. It maintains the layout through its `aspectRatio` property to prevent annoying Content Layout Shifts (CLS), and cleanly fades in the final video once it's completely ready.

## Installation

```bash
npm install @slopmachine/svelte
```

## Basic Usage

The minimum required prop is `bucketId`, which maps directly to your generation session.

```svelte
<script>
  import { SlopVideo } from "@slopmachine/svelte";
</script>

<div class="w-64">
  <SlopVideo bucketId="my-unique-video-bucket" />
</div>
```

## Advanced Usage

You can override variables, pass custom metadata at runtime, specify an aspect ratio, and even override the default loading skeleton via the `loader` Svelte snippet. Standard `<video>` attributes are also supported via `...restProps`.

```svelte
<script>
  import { SlopVideo } from "@slopmachine/svelte";
</script>

<SlopVideo
  bucketId="promo-video-bucket"
  aspectRatio="16:9"
  variables={{ theme: "cyberpunk", speed: "fast" }}
  metadata={{ campaign: "summer_launch", source: "landing_hero" }}
  class="rounded-lg shadow-xl"
  autoplay
  loop
  muted
>
  {#snippet loader()}
    <div
      class="flex h-full items-center justify-center text-blue-500 bg-gray-900 rounded-lg"
    >
      Generating custom video...
    </div>
  {/snippet}
</SlopVideo>
```

## Loading States

To detect when the generation and loading is complete, you can pass standard HTML `onloadeddata` and `onerror` event handlers to the component. These events are forwarded to the underlying `<video>` element and will not override the built-in loading shimmer effect.

You can also completely customize the loading UI by providing a custom `loader` snippet.

## Error States

If the video fails to generate or load, the component replaces it with a default error message in the same space, so the layout doesn't shift. Use the `errorFallback` snippet to render your own UI, and `onGenerationError` to log or report the failure.

```svelte
<script lang="ts">
  import { SlopVideo, type SlopMachineError } from "@slopmachine/svelte";

  function report(error: SlopMachineError) {
    analytics.track("slop_error", { status: error.status, message: error.message });
  }
</script>

<SlopVideo bucketId="my-unique-bucket-id" onGenerationError={report}>
  {#snippet errorFallback({ error })}
    <p>Couldn't generate this video: {error.message}</p>
  {/snippet}
</SlopVideo>
```

Both receive a `SlopMachineError`. When the API rejected the request, `error.message` is the API's error (e.g. a missing required variable) and `error.status` is the HTTP status (`400` for validation errors, `500` for generation failures). If the video file itself failed to load, `status` is `undefined`. `onGenerationError` is called once per URL.

## Preloading

You can import and use `preloadVideo` from `@slopmachine/svelte` to cache the asset before rendering the component.

```svelte
<script>
  import { preloadVideo } from "@slopmachine/svelte";

  // Call this early in your component lifecycle or route load function
  preloadVideo({ bucketId: "my-unique-video-bucket" });
</script>
```

## Props Reference

The `SlopVideo` component inherits from `SlopVideoOptions`. It also implements Svelte-specific properties.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific video generation session/bucket.

### `aspectRatio`

**Type:** `"9:16" | "16:9"` (Optional, Default: `"16:9"`)
Sets the CSS aspect ratio of the wrapper element to prevent layout shifts. Examples: `"16:9"`, `"9:16"`.

### `duration`

**Type:** `number` (Optional, Default: bucket version duration or `4`)
The duration of the generated video in seconds. Must be between 4 and 8. Ignored if `resultId` is provided.

### `version`

**Type:** `number` (Optional)
Useful for cache-busting or fetching a specific generation iteration.

### `resultId`

**Type:** `string` (Optional)
If a specific result ID is known, it can be fetched directly.

### `original`

**Type:** `boolean` (Optional, Default: `false`)
If `true`, bypasses the optimized media and returns the original generated file.

### `variables`

**Type:** `Record<string, string | number | undefined | null>` (Optional)
A dictionary of prompt variables interpolated dynamically. Example: `{ subject: "dog", style: "neon" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `metadata`

**Type:** `Record<string, any>` (Optional)
Arbitrary custom metadata to attach to the generation request and resulting document. Available for both Buckets and Pipelines. Example: `{ userId: "usr_123", campaign: "summer_launch" }`.

### `attachments`

**Type:** `string[]` (Optional)
An array of string URLs representing temporary file attachments to be used by the generative AI model.

### `baseUrl`

**Type:** `string` (Optional)
Full endpoint URL to send requests to instead of the default production `renderVideo` endpoint (or `renderPipeline` when using `pipelineId`).

### `class`

**Type:** `string` (Optional)
Sets the class string on the outer wrapper element.

### `loader` Snippet

**Type:** Svelte `Snippet` (Optional)
Replaces the default spinner and shimmer effect. Pass a snippet to render custom skeleton markup or text while the video is loading.

### `errorFallback` Snippet

**Type:** Svelte `Snippet<[{ error: SlopMachineError }]>` (Optional)
Replaces the default error message shown when the video fails to generate or load. Receives `{ error }`.

### `onGenerationError`

**Type:** `(error: SlopMachineError) => void` (Optional)
Called once per URL when the video fails to generate or load. See [Error States](#error-states).

### HTML Props

You can pass standard attributes like `autoplay`, `loop`, `muted`, `controls`, etc. The component applies the `class` property to the outer wrapper `div`, while spreading `...restProps` onto the underlying `<video>` tag where applicable.
