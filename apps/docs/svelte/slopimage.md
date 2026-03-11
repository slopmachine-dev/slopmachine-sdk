# Svelte `<SlopImage />`

The `@slopmachine/svelte` package provides a top-tier Developer Experience (DX) for seamlessly rendering SlopMachine generated images in your Svelte applications.

The Svelte component handles fetching logic, caching, and state transitions, and takes advantage of Svelte 5 snippets for the custom `loader` template. It maintains the layout through its `aspectRatio` property to prevent annoying Content Layout Shifts (CLS), and cleanly fades in the final image once it's completely ready.

Try the [Live Interactive Svelte Demo](https://slopmachine.github.io/slopmachine-sdk/demo-svelte/) to see the component in action!

## Installation

```bash
npm install @slopmachine/svelte
```

## Basic Usage

The minimum required prop is `bucketId`, which maps directly to your generation session.

```svelte
<script>
  import { SlopImage } from "@slopmachine/svelte";
</script>

<div class="w-64">
  <SlopImage bucketId="my-unique-bucket-id" />
</div>
```

## Advanced Usage

You can override variables, specify an aspect ratio, pick a model, and even override the default loading skeleton via the `loader` Svelte snippet. Standard `<img>` attributes are also supported via `...restProps`.

```svelte
<script>
  import { SlopImage } from "@slopmachine/svelte";
</script>

<SlopImage
  bucketId="user-avatar-bucket"
  aspectRatio="1:1"
  model="gemini-flash"
  variables={{ theme: "cyberpunk", detail: 100 }}
  class="rounded-full shadow-lg"
>
  {#snippet loader()}
    <div class="flex h-full items-center justify-center text-blue-500">
      Generating custom avatar...
    </div>
  {/snippet}
</SlopImage>
```

## Props Reference

The `SlopImage` component inherits from `SlopImageOptions`. It also implements Svelte-specific properties.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific image generation session/bucket.

### `aspectRatio`

**Type:** `string` (Optional, Default: `"1:1"`)
Sets the CSS aspect ratio of the wrapper element to prevent layout shifts. Examples: `"16:9"`, `"4:3"`.

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
A dictionary of prompt variables interpolated dynamically. Example: `{ character: "cat", style: "neon" }`.

### `baseUrl`

**Type:** `string` (Optional)
Override the default SlopMachine API URL if you are using a self-hosted or proxy backend.

### `class`

**Type:** `string` (Optional)
Sets the class string on the outer wrapper element.

### `loader` Snippet

**Type:** Svelte `Snippet` (Optional)
Replaces the default spinner and shimmer effect. Pass a snippet to render custom skeleton markup or text while the image is loading.

### HTML Props

You can pass standard attributes like `alt`, `loading`, etc. The component will spread `...restProps` onto the underlying `<img>` tag where applicable.
