---
description: Reference documentation for the Slop Machine Render Image API.
---

# Render Image API

The Render Image API is the primary endpoint for generating and retrieving images from Slop Machine. It is designed to be used directly in your application's `<img>` tags, CSS backgrounds, or anywhere else you'd normally use an image URL.

Behind the scenes, the API handles template resolution, heavy caching, concurrency protection, and on-demand image generation, ensuring your application remains fast and cost-effective.

## Endpoint Details

- **Method**: `GET`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage`
- **Authentication**: Publicly accessible (secured by your bucket configurations)

## Constructing the URL

You can consume the API by constructing a URL with the appropriate query parameters. The easiest way to do this in JavaScript/TypeScript is using the `@slopmachine/core` package.

### Using `@slopmachine/core`

The `buildImageUrl` utility function safely constructs the URL, automatically handling URL-encoding for your variables.

```typescript
import { buildImageUrl } from "@slopmachine/core";

const imageUrl = buildImageUrl({
  bucketId: "your-bucket-id",
  variables: {
    theme: "dark",
    username: "alice",
  },
  aspectRatio: "16:9",
});

// Use it directly in an image tag!
// <img src={imageUrl} alt="Generated image" />
```

### Preloading Images

If you know you will need an image soon, you can preload it into the browser's cache using the `preloadImage` function.

```typescript
import { preloadImage } from "@slopmachine/core";

// Initiates the request to load the image and returns a promise
await preloadImage({
  bucketId: "your-bucket-id",
  variables: {
    theme: "dark",
    username: "alice",
  },
});
```

### Manual URL Construction

If you are not using JavaScript or prefer to build the URL yourself, you can append the parameters directly to the base URL.

**Important:** The `variables` parameter must be a valid, URL-encoded JSON string.

```text
https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage?bucketId=your-bucket-id&aspectRatio=16%3A9&variables=%7B%22theme%22%3A%22dark%22%2C%22username%22%3A%22alice%22%7D
```

## Query Parameters

| Parameter     | Type     | Required | Default    | Description                                                                                                                                                    |
| :------------ | :------- | :------: | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bucketId`    | `string` | **Yes**  |            | The unique identifier of the Bucket you are generating an image from.                                                                                          |
| `variables`   | `string` |    No    | `{}`       | A URL-encoded JSON string containing variables to inject into your prompt templates. Example: `{"name": "Alice"}`. Extraneous or unused variables are ignored. |
| `aspectRatio` | `string` |    No    | `"1:1"`    | Target aspect ratio (`"1:1"`, `"2:3"`, `"3:2"`, `"3:4"`, `"4:3"`, `"4:5"`, `"5:4"`, `"9:16"`, `"16:9"`, `"21:9"`).                                             |
| `model`       | `string` |    No    | `"gemini"` | Overrides the AI model used for generation.                                                                                                                    |
| `quality`     | `string` |    No    | `"fast"`   | The target quality (`"fast"` or `"high"`). Only affects new generations and is **ignored** for caching. Ignored if `model` is provided.                        |
| `version`     | `number` |    No    | _Current_  | The specific version number of the Bucket to target. Defaults to the active version.                                                                           |
| `resultId`    | `string` |    No    |            | If provided, directly returns a specific, previously generated result by its ID, ignoring all other parameters.                                                |

## How It Works

The Render Image API is built to be a resilient, drop-in solution for dynamic imagery. Here are the key behaviors you should expect when consuming the endpoint:

### 1. Automatic Redirects

On a successful request, the API responds with an HTTP `302 Found` redirect pointing directly to the final image file (hosted on a global CDN). This means you can place the API URL directly into an `<img src="...">` attribute without needing to fetch and parse a JSON response first.

### 2. Intelligent Caching

Images are heavily cached to minimize latency and generation costs. The API generates a unique cache key based on your exact inputs (the resolved prompt, variables, and aspect ratio).

- **Cache Hit**: If an image matching those exact parameters has already been generated, the API immediately redirects to the cached image. The redirect includes long-lived cache headers (`Cache-Control: public, max-age=31536000`).
- **Cache Miss**: If it's a new combination of inputs, the API generates the image on the fly, caches the result globally, and then redirects.

### 3. Concurrency Control (Thundering Herd Protection)

If your application experiences a sudden spike in traffic, hundreds of users might request the exact same un-cached image simultaneously. The API automatically coordinates these requests. Only the first request will trigger the generation process, while the others will safely wait and listen for the result. Once the image is ready, all pending requests instantly resolve to the newly generated URL.

### 4. Graceful Error Handling

If an error occurs during generation (e.g., missing required variables, moderation flag, or an internal timeout), the API responds with an HTTP `500` (or `400` for validation errors).
