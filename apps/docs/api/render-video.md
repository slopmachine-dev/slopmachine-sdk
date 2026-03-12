# Render Video API

The Render Video API is the primary endpoint for generating and retrieving videos from Slop Machine. It is designed to be used directly in your application's `<video>` tags or anywhere else you'd normally use a video URL.

Behind the scenes, the API handles template resolution, heavy caching, concurrency protection, and on-demand video generation, ensuring your application remains fast and cost-effective.

## Endpoint Details

- **Method**: `GET`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderVideo`
- **Authentication**: Publicly accessible (secured by your bucket configurations)

## Constructing the URL

You can consume the API by constructing a URL with the appropriate query parameters. The easiest way to do this in JavaScript/TypeScript is using the `@slopmachine/core` package.

### Using `@slopmachine/core`

The `buildVideoUrl` utility function safely constructs the URL, automatically handling URL-encoding for your variables.

```typescript
import { buildVideoUrl } from "@slopmachine/core";

const videoUrl = buildVideoUrl({
  bucketId: "your-bucket-id",
  variables: {
    theme: "dark",
    subject: "a soaring eagle",
  },
  aspectRatio: "16:9",
});

// Use it directly in a video tag!
// <video src={videoUrl} controls autoPlay loop />
```

### Manual URL Construction

If you are not using JavaScript or prefer to build the URL yourself, you can append the parameters directly to the base URL.

**Important:** The `variables` parameter must be a valid, URL-encoded JSON string.

```text
https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderVideo?bucketId=your-bucket-id&aspectRatio=16%3A9&variables=%7B%22theme%22%3A%22dark%22%2C%22subject%22%3A%22a%20soaring%20eagle%22%7D
```

## Query Parameters

| Parameter     | Type     | Required | Default   | Description                                                                                                        |
| :------------ | :------- | :------: | :-------- | :----------------------------------------------------------------------------------------------------------------- |
| `bucketId`    | `string` | **Yes**  |           | The unique identifier of the Bucket you are generating a video from.                                               |
| `variables`   | `string` |    No    | `{}`      | A URL-encoded JSON string containing variables to inject into your prompt templates. Example: `{"name": "Alice"}`. |
| `aspectRatio` | `string` |    No    | `"16:9"`  | Target aspect ratio (`"9:16"`, `"16:9"`).                                                                          |
| `duration`    | `number` |    No    | `4`       | The duration of the generated video in seconds. Must be between 4 and 8. Ignored if `resultId` is provided.        |
| `model`       | `string` |    No    |           | Overrides the AI model used for generation.                                                                        |
| `version`     | `number` |    No    | _Current_ | The specific version number of the Bucket to target. Defaults to the active version.                               |
| `resultId`    | `string` |    No    |           | If provided, directly returns a specific, previously generated result by its ID.                                   |

## How It Works

The Render Video API is built to be a resilient, drop-in solution for dynamic video generation. Here are the key behaviors you should expect when consuming the endpoint:

### 1. Automatic Redirects

On a successful request, the API responds with an HTTP `302 Found` redirect pointing directly to the final video file (hosted on a global CDN). This means you can place the API URL directly into a `<video src="...">` attribute without needing to fetch and parse a JSON response first.

### 2. Intelligent Caching

Videos are heavily cached to minimize latency and generation costs. The API generates a unique cache key based on your exact inputs (the resolved prompt, variables, and aspect ratio).

- **Cache Hit**: If a video matching those exact parameters has already been generated, the API immediately redirects to the cached video. The redirect includes long-lived cache headers (`Cache-Control: public, max-age=31536000`).
- **Cache Miss**: If it's a new combination of inputs, the API generates the video on the fly, caches the result globally, and then redirects.

### 3. Concurrency Control (Thundering Herd Protection)

If your application experiences a sudden spike in traffic, hundreds of users might request the exact same un-cached video simultaneously. The API automatically coordinates these requests. Only the first request will trigger the generation process, while the others will safely wait and listen for the result. Once the video is ready, all pending requests instantly resolve to the newly generated URL.

### 4. Graceful Error Handling

If an error occurs during generation (e.g., missing required variables, moderation flag, or an internal timeout), the API responds with an HTTP `500` (or `400` for validation errors).
