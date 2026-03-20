---
description: Documentation and API reference for the Svelte SlopText component.
---

# Svelte `<SlopText />`

The `@slopmachine/svelte` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated text (markdown) in your Svelte applications.

By default, the component handles loading states with a nice built-in shimmer effect and loading spinner. It automatically fetches the markdown content from the generated text URL, parses it, and renders it cleanly once it is ready.

Try the [Live Interactive Svelte Demo](https://slopmachine-dev.github.io/slopmachine-sdk/demo-svelte/) to see the component in action!

## Installation

```bash
npm install @slopmachine/svelte
```

## Basic Usage

The minimum required prop is `bucketId`. This ties the component to a specific AI generation task.

```svelte
<script>
  import { SlopText } from "@slopmachine/svelte";
</script>

<div class="prose max-w-none">
  <SlopText bucketId="my-unique-bucket-id" />
</div>
```

## Advanced Usage

You can override variables, pick a model, and even override the default loading skeleton via the `loader` snippet. `SlopText` automatically fetches the text from the `renderText` endpoint and renders it as Markdown.

```svelte
<script>
  import { SlopText } from "@slopmachine/svelte";
</script>

<SlopText
  bucketId="blog-post-bucket"
  model="gemini-pro"
  variables={{ topic: "cyberpunk", length: "long" }}
  class="text-lg text-gray-800"
>
  {#snippet loader()}
    <div class="flex h-32 items-center justify-center text-blue-500">
      Generating post content...
    </div>
  {/snippet}
</SlopText>
```

## Preloading

You can import and use `preloadText` from `@slopmachine/svelte` to cache the asset before rendering the component.

```svelte
<script>
  import { preloadText } from "@slopmachine/svelte";

  // Call this early in your component lifecycle or route load function
  preloadText({ bucketId: "my-unique-bucket-id" });
</script>
```

## Props Reference

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific text generation session/bucket.

### `model`

**Type:** `"gemini" | "gemini-flash" | "gemini-pro" | "imagen"` (Optional)
Specify the underlying generative AI model to use.

### `version`

**Type:** `number` (Optional)
Useful for cache-busting or fetching a specific generation iteration.

### `resultId`

**Type:** `string` (Optional)
If a specific result ID is known, it can be fetched directly.

### `variables`

**Type:** `Record<string, string | number | undefined | null>` (Optional)
A dictionary of prompt variables interpolated dynamically. Example: `{ topic: "svelte", style: "tutorial" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `baseUrl`

**Type:** `string` (Optional)
Override the default Slop Machine API URL if you are using a self-hosted or proxy backend.

### `loader` (Snippet)

Replaces the default spinner and shimmer effect. Pass a snippet to render a custom skeleton or text while the content is loading.

### HTML `<div>` Attributes

You can pass standard attributes like `class`, `style`, etc. These props will be applied to the outer wrapper `div` that contains the rendered Markdown content. Note that in Svelte, you use `class` instead of React's `className`.
