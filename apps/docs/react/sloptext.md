---
description: Documentation and API reference for the React SlopText component.
---

# React `<SlopText />`

The `@slopmachine/react` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated text (markdown) in your React applications.

By default, the component handles loading states with a built-in shimmer effect and loading spinner. It automatically fetches the markdown content from the generated text URL, parses it, and renders it beautifully while ensuring the layout respects its container without unnecessary layout shifts.

Try the [Live Interactive React Demo](https://slopmachine-dev.github.io/slopmachine-sdk/demo-react/) to see the component in action!

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

You can override variables, specify a model, and even override the default loading skeleton via the `loader` prop. `SlopText` automatically fetches the text from the `renderText` endpoint and renders it as Markdown.

```tsx
import { SlopText } from "@slopmachine/react";

function BlogPost() {
  return (
    <SlopText
      bucketId="blog-post-bucket"
      model="gemini-pro"
      variables={{ topic: "cyberpunk", length: "long" }}
      className="text-lg text-gray-800"
      loader={
        <div className="flex h-32 items-center justify-center text-blue-500">
          Generating post content...
        </div>
      }
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

The `SlopText` component takes parameters to build the URL and fetch the Markdown text, adding a `loader` property and taking standard HTML `div` attributes for the wrapper.

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
A dictionary of prompt variables interpolated dynamically. Example: `{ topic: "react", style: "educational" }`. Any extraneous or unused variables provided that are not required by the resolved templates are automatically stripped out to ensure they do not unnecessarily bust the cache.

### `baseUrl`

**Type:** `string` (Optional)
Override the default Slop Machine API URL if you are using a self-hosted or proxy backend.

### `loader`

**Type:** `React.ReactNode` (Optional)
Replaces the default spinner and shimmer effect. Render a custom skeleton or text while the text is loading.

### HTML `<div>` Props

You can pass standard attributes like `className`, `style`, etc. These props will be applied to the outer wrapper `div` that contains the rendered Markdown content.
