---
description: Documentation and API reference for the React SlopText component.
---

# React `<SlopText />`

The `@slopmachine/react` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated text (markdown) in your React applications.

By default, the component handles loading states with a built-in shimmer effect and loading spinner. It automatically fetches the markdown content from the generated text URL, parses it, and renders it beautifully while ensuring the layout respects its container without unnecessary layout shifts.

Try the [Live Interactive React Demo](https://docs.slopmachine.dev/demo-react/) to see the component in action!

## Installation

```bash
npm install @slopmachine/react
```

## Basic Usage

The minimum required prop is `bucketId`. This ties the component to a specific AI text generation task.

```tsx
import { SlopText } from "@slopmachine/react";

function MyArticle() {
  return (
    <div className="prose max-w-none">
      <SlopText bucketId="my-unique-bucket-id" />
    </div>
  );
}
```

## Advanced Usage

You can override variables, pass custom metadata at runtime, specify a model, and override the default loading skeleton and error state via the `fallback` and `errorFallback` props. `SlopText` automatically fetches the text from the `renderText` endpoint and renders it as Markdown.

The generated Markdown is converted to HTML and sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) before rendering, so scripts, event handlers, and `javascript:` links in model output are stripped. During server-side rendering, where no DOM is available, the text is rendered HTML-escaped instead.

```tsx
import { SlopText } from "@slopmachine/react";

function BlogPost() {
  return (
    <SlopText
      bucketId="blog-post-bucket"
      model="gemini-pro"
      variables={{ topic: "cyberpunk", length: "long" }}
      metadata={{ authorId: "usr_42", department: "content" }}
      className="text-lg text-gray-800"
      fallback={
        <div className="flex h-32 items-center justify-center text-blue-500">
          Generating post content...
        </div>
      }
      errorFallback={<div>Failed to load post.</div>}
    />
  );
}
```

## Preloading

You can import and use `preloadText` from `@slopmachine/react` to cache the asset before rendering the component.

```tsx
import { preloadText } from "@slopmachine/react";

// Call this early in your component lifecycle or route loader
preloadText({ bucketId: "my-unique-bucket-id" });
```

## Props Reference

The `SlopText` component takes parameters to build the URL and fetch the Markdown text, adding `fallback` and `errorFallback` properties and taking standard HTML `div` attributes for the wrapper.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific text generation session/bucket.

### `model`

**Type:** `string` (Optional, e.g. `"gemini-pro"`)
Overrides the AI model used for generation. Defaults to the bucket version's configured model. Ignored if `resultId` is provided.

### `version`

**Type:** `number` (Optional)
Useful for cache-busting or fetching a specific generation iteration.

### `resultId`

**Type:** `string` (Optional)
If a specific result ID is known, it can be fetched directly.

### `variables`

**Type:** `Record<string, string | number | undefined | null>` (Optional)
A dictionary of prompt variables interpolated dynamically. Example: `{ topic: "react", style: "educational" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `metadata`

**Type:** `Record<string, any>` (Optional)
Arbitrary custom metadata to attach to the generation request and resulting document. Available for both Buckets and Pipelines. Example: `{ userId: "usr_123", authorId: "usr_42" }`.

### `attachments`

**Type:** `string[]` (Optional)
An array of string URLs representing temporary file attachments to be used by the generative AI model.

### `baseUrl`

**Type:** `string` (Optional)
Full endpoint URL to send requests to instead of the default production `renderText` endpoint (or `renderPipeline` when using `pipelineId`).

### `fallback`

**Type:** `React.ReactNode` (Optional)
Replaces the default spinner and shimmer effect. Render a custom skeleton or text while the text is loading.

### `errorFallback`

**Type:** `React.ReactNode` (Optional)
Rendered instead of the text if generation or fetching fails.

### HTML `<div>` Props

You can pass standard attributes like `className`, `style`, etc. These props will be applied to the outer wrapper `div` that contains the rendered Markdown content.
