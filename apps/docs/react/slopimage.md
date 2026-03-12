# React `<SlopImage />`

The `@slopmachine/react` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated images in your React applications.

By default, the component handles loading states with a nice built-in shimmer effect and loading spinner. It ensures the layout respects the `aspectRatio` without layout shifts (CLS), and cleanly fades in the final image once it is ready.

Try the [Live Interactive React Demo](https://slopmachine-dev.github.io/slopmachine-sdk/demo-react/) to see the component in action!

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

You can override variables, specify an aspect ratio, pick a model, and even override the default loading skeleton via the `loader` prop. `SlopImage` also inherits standard `<img>` attributes (excluding `src` and `alt`, which are managed for you).

```tsx
import { SlopImage } from "@slopmachine/react";

function Avatar() {
  return (
    <SlopImage
      bucketId="user-avatar-bucket"
      aspectRatio="1:1"
      model="gemini-flash"
      variables={{ theme: "cyberpunk", detail: 100 }}
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

## Props Reference

The `SlopImage` component inherits from `SlopImageOptions`, adding a `loader` property and standard HTML image attributes.

### `bucketId`

**Type:** `string` (Required)
The unique identifier for the specific image generation session/bucket.

### `aspectRatio`

**Type:** `"1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9"` (Optional, Default: `"1:1"`)
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
Override the default Slop Machine API URL if you are using a self-hosted or proxy backend.

### `loader`

**Type:** `React.ReactNode` (Optional)
Replaces the default spinner and shimmer effect. Render a custom skeleton or text while the image is loading.

### HTML `<img>` Props

You can pass standard attributes like `className`, `style`, `onLoad`, `onError`, `loading="lazy"`, etc. The component will spread these onto the underlying `<img>` element or wrapper where appropriate.
