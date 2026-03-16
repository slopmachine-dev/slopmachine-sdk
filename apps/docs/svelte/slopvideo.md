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

You can override variables, specify an aspect ratio, pick a model, and even override the default loading skeleton via the `loader` Svelte snippet. Standard `<video>` attributes are also supported via `...restProps`.

```svelte
<script>
  import { SlopVideo } from "@slopmachine/svelte";
</script>

<SlopVideo
  bucketId="promo-video-bucket"
  aspectRatio="16:9"
  variables={{ theme: "cyberpunk", speed: "fast" }}
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

## Props Reference

The `SlopVideo` component inherits from `SlopVideoOptions`. It also implements Svelte-specific properties.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific video generation session/bucket.

### `aspectRatio`

**Type:** `"9:16" | "16:9"` (Optional, Default: `"16:9"`)
Sets the CSS aspect ratio of the wrapper element to prevent layout shifts. Examples: `"16:9"`, `"9:16"`.

### `duration`

**Type:** `number` (Optional, Default: `4`)
The duration of the generated video in seconds. Must be between 4 and 8. Ignored if `resultId` is provided.

### `model`

**Type:** `string` (Optional)
Specify the underlying generative AI video model to use.

### `version`

**Type:** `number` (Optional)
Useful for cache-busting or fetching a specific generation iteration.

### `resultId`

**Type:** `string` (Optional)
If a specific result ID is known, it can be fetched directly.

### `variables`

**Type:** `Record<string, string | number | undefined | null>` (Optional)
A dictionary of prompt variables interpolated dynamically. Example: `{ subject: "dog", style: "neon" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `baseUrl`

**Type:** `string` (Optional)
Override the default Slop Machine API URL if you are using a self-hosted or proxy backend.

### `class`

**Type:** `string` (Optional)
Sets the class string on the outer wrapper element.

### `loader` Snippet

**Type:** Svelte `Snippet` (Optional)
Replaces the default spinner and shimmer effect. Pass a snippet to render custom skeleton markup or text while the video is loading.

### HTML Props

You can pass standard attributes like `autoplay`, `loop`, `muted`, `controls`, etc. The component applies the `class` property to the outer wrapper `div`, while spreading `...restProps` onto the underlying `<video>` tag where applicable.
