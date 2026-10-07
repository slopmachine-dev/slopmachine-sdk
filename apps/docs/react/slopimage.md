---
description: Documentation and API reference for the React SlopImage component.
---

# React `<SlopImage />`

The `@slopmachine/react` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated images in your React applications.

By default, the component handles loading states with a nice built-in shimmer effect and loading spinner. It ensures the layout respects the `aspectRatio` without layout shifts (CLS), and cleanly fades in the final image once it is ready.

Try the [Live Interactive React Demo](https://docs.slopmachine.dev/demo-react/) to see the component in action!

## Installation

```bash
npm install @slopmachine/react
```

## Basic Usage

The minimum required prop is `bucketId`. This ties the component to a specific AI generation task.

```tsx
import { SlopImage } from "@slopmachine/react";

function MyGallery() {
  return (
    <div className="w-64">
      <SlopImage bucketId="my-unique-bucket-id" />
    </div>
  );
}
```

## Advanced Usage

You can override variables, pass custom metadata at runtime, specify an aspect ratio, pick a model, and even override the default loading skeleton via the `loader` prop. `SlopImage` also inherits standard `<img>` attributes (excluding `src`, which is managed for you).

```tsx
import { SlopImage } from "@slopmachine/react";

function Avatar() {
  return (
    <SlopImage
      bucketId="user-avatar-bucket"
      aspectRatio="1:1"
      model="gemini-flash"
      variables={{ theme: "cyberpunk", detail: 100 }}
      metadata={{ userId: "usr_123", source: "profile-editor" }}
      className="rounded-full shadow-lg"
      loader={
        <div className="flex h-full items-center justify-center text-blue-500">
          Generating custom avatar...
        </div>
      }
    />
  );
}
```

## Loading States

To detect when the generation and loading is complete, you can pass standard HTML `onLoad` and `onError` event handlers to the component. These events are forwarded to the underlying `<img>` element and will not override the built-in loading shimmer effect.

You can also completely customize the loading UI by providing a custom `loader` prop.

Generation starts as soon as the component mounts. It sends a lightweight `HEAD` request so the backend can begin generating straight away, because generation can take a while. Passing `loading="lazy"` only defers downloading the finished image until it's near the viewport; it does not defer generation. Results are cached, so the early request never causes a duplicate generation.

## Error States

If the image fails to generate or load, the component replaces it with a default error message in the same space, so the layout doesn't shift. Use `errorFallback` to render your own UI, and `onGenerationError` to log or report the failure.

```tsx
import { SlopImage, type SlopMachineError } from "@slopmachine/react";

<SlopImage
  bucketId="my-unique-bucket-id"
  errorFallback={(error) => <p>Couldn't generate this image: {error.message}</p>}
  onGenerationError={(error: SlopMachineError) => {
    analytics.track("slop_error", { status: error.status, message: error.message });
  }}
/>
```

Both receive a `SlopMachineError`. When the API rejected the request, `error.message` is the API's error (e.g. a missing required variable) and `error.status` is the HTTP status (`400` for validation errors, `500` for generation failures). If the image file itself failed to load, `status` is `undefined`. `onGenerationError` is called once per URL.

## Preloading

You can import and use `preloadImage` from `@slopmachine/react` to cache the asset before rendering the component.

```tsx
import { preloadImage } from "@slopmachine/react";

// Call this early in your component lifecycle or route loader
preloadImage({ bucketId: "my-unique-bucket-id" });
```

## Props Reference

The `SlopImage` component inherits from `SlopImageOptions`, adding a `loader` property and standard HTML image attributes.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific image generation session/bucket.

### `aspectRatio`

**Type:** `"1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"` (Optional, Default: `"1:1"`)
Sets the CSS aspect ratio of the wrapper element to prevent layout shifts. Examples: `"16:9"`, `"4:3"`.

### `model`

**Type:** `string` (Optional, e.g. `"gemini-flash"`)
Overrides the AI model used for generation. Defaults to the bucket version's configured model. Ignored if `resultId` is provided.

### `version`

**Type:** `number` (Optional)
Useful for cache-busting or fetching a specific generation iteration.

### `resultId`

**Type:** `string` (Optional)
If a specific result ID is known, it can be fetched directly.

### `original`

**Type:** `boolean` (Optional, Default: `false`)
If `true`, bypasses the WebP optimized media and returns the original generated file (i.e. PNG).

### `variables`

**Type:** `Record<string, string | number | undefined | null>` (Optional)
A dictionary of prompt variables interpolated dynamically. Example: `{ character: "cat", style: "neon" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `metadata`

**Type:** `Record<string, any>` (Optional)
Arbitrary custom metadata to attach to the generation request and resulting document. Available for both Buckets and Pipelines. Example: `{ userId: "usr_123", feature: "avatar-generator" }`.

### `attachments`

**Type:** `string[]` (Optional)
An array of string URLs representing temporary file attachments to be used by the generative AI model.

### `baseUrl`

**Type:** `string` (Optional)
Full endpoint URL to send requests to instead of the default production `renderImage` endpoint (or `renderPipeline` when using `pipelineId`).

### `loader`

**Type:** `React.ReactNode` (Optional)
Replaces the default spinner and shimmer effect. Render a custom skeleton or text while the image is loading.

### `errorFallback`

**Type:** `React.ReactNode | ((error: SlopMachineError) => React.ReactNode)` (Optional)
Replaces the default error message shown when the image fails to generate or load. Pass a node, or a function that receives the error.

### `onGenerationError`

**Type:** `(error: SlopMachineError) => void` (Optional)
Called once per URL when the image fails to generate or load. See [Error States](#error-states).

### `alt`

**Type:** `string` (Optional, Default: `"Image produced by Slop Machine (slopmachine.dev)"`)
Alternative text for screen readers and for when the image can't be shown. Describe what the image shows (e.g. `alt={`Avatar for ${user.name}`}`), or pass `""` if the image is purely decorative.

### `objectFit`

**Type:** `React.CSSProperties["objectFit"]` (Optional, Default: `"cover"`)
How the image should be resized to fit its container. Maps directly to the CSS `object-fit` property.

### `imageClassName`

**Type:** `string` (Optional)
Additional CSS classes to apply directly to the inner `<img>` element. Useful when you need to target the image itself rather than the wrapper.

### HTML `<img>` Props

You can pass standard attributes like `className`, `style`, `onLoad`, `onError`, `loading="lazy"`, etc. The `className` and `style` props will be applied to the outer wrapper `div`, while most event handlers and `img`-specific attributes are spread onto the underlying `<img>` element. Use `imageClassName` if you need to pass classes directly to the inner image element.
