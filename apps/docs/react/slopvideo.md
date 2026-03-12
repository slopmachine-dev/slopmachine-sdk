# React `<SlopVideo />`

The `@slopmachine/react` package provides a top-tier Developer Experience (DX) for seamlessly rendering Slop Machine generated videos in your React applications.

By default, the component handles loading states with a nice built-in shimmer effect and loading spinner. It ensures the layout respects the `aspectRatio` without layout shifts (CLS), and cleanly fades in the final video once it is ready.

## Installation

```bash
npm install @slopmachine/react
```

## Basic Usage

The minimum required prop is `bucketId`. This ties the component to a specific AI generation task.

```tsx
import { SlopVideo } from "@slopmachine/react";

function MyGallery() {
  return (
    <div className="w-64">
      <SlopVideo bucketId="my-unique-video-bucket" />
    </div>
  );
}
```

## Advanced Usage

You can override variables, specify an aspect ratio, pick a model, and even override the default loading skeleton via the `loader` prop. `SlopVideo` also inherits standard `<video>` attributes (excluding `src`, which is managed for you).

```tsx
import { SlopVideo } from "@slopmachine/react";

function PromoVideo() {
  return (
    <SlopVideo
      bucketId="promo-video-bucket"
      aspectRatio="16:9"
      variables={{ theme: "cyberpunk", speed: "fast" }}
      className="rounded-lg shadow-xl"
      autoPlay
      loop
      muted
      loader={
        <div className="flex h-full items-center justify-center text-blue-500 bg-gray-900 rounded-lg">
          Generating custom video...
        </div>
      }
    />
  );
}
```

## Props Reference

The `SlopVideo` component inherits from `SlopVideoOptions`, adding a `loader` property and standard HTML video attributes.

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
A dictionary of prompt variables interpolated dynamically. Example: `{ subject: "dog", style: "neon" }`.

### `baseUrl`

**Type:** `string` (Optional)
Override the default Slop Machine API URL if you are using a self-hosted or proxy backend.

### `loader`

**Type:** `React.ReactNode` (Optional)
Replaces the default spinner and shimmer effect. Render a custom skeleton or text while the video is loading.

### HTML `<video>` Props

You can pass standard attributes like `className`, `style`, `onLoad`, `onError`, `autoPlay`, `loop`, `muted`, `controls`, etc. The component will spread these onto the underlying `<video>` element or wrapper where appropriate.
