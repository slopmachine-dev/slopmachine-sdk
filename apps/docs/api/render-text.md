---
description: Reference documentation for the Slop Machine Render Text API.
---

# Render Text API

The Render Text API is the primary endpoint for generating and retrieving text from Slop Machine. It is designed to be fetched directly in your application or anywhere else you'd normally use a text URL.

Behind the scenes, the API handles template resolution, heavy caching, concurrency protection, and on-demand text generation, ensuring your application remains fast and cost-effective.

## Endpoint Details

- **Method**: `GET`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderText`
- **Authentication**: Publicly accessible (secured by your bucket configurations)

## Constructing the URL

You can consume the API by constructing a URL with the appropriate query parameters. The easiest way to do this in JavaScript/TypeScript is using the `@slopmachine/core` package.

### Using `@slopmachine/core`

The `buildTextUrl` utility function safely constructs the URL, automatically handling URL-encoding for your variables.

```typescript
import { buildTextUrl } from "@slopmachine/core";

const textUrl = buildTextUrl({
  bucketId: "your-bucket-id",
  variables: {
    theme: "dark",
    username: "alice",
  },
});

// Fetch the content!
// const response = await fetch(textUrl);
// const markdown = await response.text();
```

### Preloading Text

If you know you will need a text result soon, you can preload it into the browser's cache using the `preloadText` function.

```typescript
import { preloadText } from "@slopmachine/core";

// Initiates the request to load the text and returns a promise
await preloadText({
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
https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderText?bucketId=your-bucket-id&variables=%7B%22theme%22%3A%22dark%22%2C%22username%22%3A%22alice%22%7D
```

## Query Parameters

| Parameter   | Type     | Required | Default    | Description                                                                                                                                                    |
| :---------- | :------- | :------: | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bucketId`  | `string` | **Yes**  |            | The unique identifier of the Bucket you are generating text from.                                                                                              |
| `prompt`    | `string` |    No    | _Bucket_   | The base prompt for generation. If omitted, the function falls back to the prompt defined in the target Bucket Version.                                        |
| `variables` | `string` |    No    | `{}`       | A URL-encoded JSON string containing variables to inject into your prompt templates. Example: `{"name": "Alice"}`. Extraneous or unused variables are ignored. |
| `model`     | `string` |    No    | `"gemini"` | Overrides the AI model used for generation.                                                                                                                    |
| `version`   | `number` |    No    | _Current_  | The specific version number of the Bucket to target. Defaults to the active version.                                                                           |
| `resultId`  | `string` |    No    |            | If provided, directly returns a specific, previously generated result by its ID, ignoring all other parameters.                                                |

## How It Works

The Render Text API is built to be a resilient, drop-in solution for dynamic text generation. Here are the key behaviors you should expect when consuming the endpoint:

### 1. Automatic Redirects

On a successful request, the API responds with an HTTP `302 Found` redirect pointing directly to the final text file (hosted on a global CDN). This means you can fetch the API URL directly and your HTTP client will automatically follow the redirect to download the text payload.

### 2. Intelligent Caching

Text results are heavily cached to minimize latency and generation costs. The API generates a unique cache key based on your exact inputs (the resolved prompt and variables).

- **Cache Hit**: If text matching those exact parameters has already been generated, the API immediately redirects to the cached text. The redirect includes long-lived cache headers (`Cache-Control: public, max-age=31536000`).
- **Cache Miss**: If it's a new combination of inputs, the API generates the text on the fly, caches the result globally, and then redirects.

### 3. Concurrency Control (Thundering Herd Protection)

If your application experiences a sudden spike in traffic, hundreds of users might request the exact same un-cached text simultaneously. The API automatically coordinates these requests. Only the first request will trigger the generation process, while the others will safely wait and listen for the result. Once the text is ready, all pending requests instantly resolve to the newly generated URL.

### 4. Graceful Error Handling

If an error occurs during generation (e.g., missing required variables, moderation flag, or an internal timeout), the API responds with an HTTP `500` (or `400` for validation errors).
