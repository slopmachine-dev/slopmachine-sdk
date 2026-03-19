---
description: Reference documentation for the Slop Machine Render Text API.
---

# Render Text API Documentation

The `renderText` Cloud Function is a highly optimized, public-facing endpoint for rendering generated text. It acts as an orchestrator that resolves templates and variables, handles heavy caching to minimize cost, manages concurrent requests (thundering herd protection), and kicks off text generation when necessary.

## Endpoint Details

- **Type**: Firebase HTTP Cloud Function (`onRequest`)
- **Method**: GET
- **CORS**: Enabled
- **Invoker**: Public
- **Typical URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderText`
- **Memory**: 2GiB
- **Timeout**: 60 seconds

---

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

### Manual URL Construction

If you are not using JavaScript or prefer to build the URL yourself, you can append the parameters directly to the base URL.

**Important:** The `variables` parameter must be a valid, URL-encoded JSON string.

```text
https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderText?bucketId=your-bucket-id&variables=%7B%22theme%22%3A%22dark%22%2C%22username%22%3A%22alice%22%7D
```

---

## Query Parameters

The function accepts data via URL query parameters.

| Parameter   | Type            | Required | Default                  | Description                                                                                                                                 |
| :---------- | :-------------- | :------: | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `bucketId`  | `string`        | **Yes**  |                          | The unique identifier of the Bucket where the result should be stored.                                                                      |
| `prompt`    | `string`        |    No    | _Bucket Version Prompt_  | The base prompt for generation. If omitted, the function falls back to the `prompt` defined in the target Bucket Version.                   |
| `model`     | `string`        |    No    | `"gemini"`               | The target model string to use for generation.                                                                                              |
| `variables` | `string` (JSON) |    No    | `{}`                     | A JSON-encoded string containing a map of variables to inject into templates. Example: `{"name": "Alice"}`. Must be valid JSON if provided. |
| `version`   | `number`        |    No    | _Bucket Current Version_ | The specific Version number of the Bucket to target. Defaults to the `currentVersion` of the bucket document.                               |
| `resultId`  | `string`        |    No    |                          | If provided, directly returns the specific result URL (if valid) and bypasses caching/generation entirely.                                  |

---

## Response Behavior

- **Success**: Returns an HTTP `302 Found` redirect to the final text URL (e.g., Cloud Storage URL). Includes a `Cache-Control` header set to cache for 1 year (`public, max-age=31536000, s-maxage=31536000`).
- **Failure**: Returns an HTTP `500 Internal Server Error` containing an SVG image dynamically generated to display the error message.
- **Validation Errors**: Returns HTTP `400 Bad Request` or `404 Not Found` with a JSON payload `{ "error": "Message" }` for missing/invalid parameters or missing resources.

---

## Execution Flow & Logic

The API relies on a multi-stage execution flow designed to maximize cache hits, resolve dynamic templating, and prevent overlapping duplicate generation requests.

### 1. Initialization and Validation

- Parses inputs. Crucially, the `variables` parameter must be valid JSON.
- Queries Firestore via `collectionGroup("buckets")` to locate the target `bucketId` and derives its parent `siloId`.
- If a `resultId` is provided, fetches that specific document. If valid, increments its `views` counter by 1 and immediately returns a `302` redirect to its `url`. Bypasses generation and cache checks.

### 2. Template and Prompt Resolution

- If the `prompt` is not provided, it fetches it from the Bucket's target version document.
- Retrieves all `Templates` from the parent Silo.
- Executes `resolveTemplates` and `resolveVariables` to expand template strings and inject provided `variables`.
- Fails with a `400` status if any required variables for the templates are missing, or if a variable value violates defined constraints in the target Bucket Version.
- Extraneous variables provided in the request that are not required by the resolved templates are stripped out. This ensures that adding unused variables does not unnecessarily bust the cache.

### 3. Cache Key Construction

A unique SHA-256 hash `cacheKey` is constructed based on the deterministic generation inputs:

- Resolved Prompt
- Template Variables

### 4. Global Cache Lookup (L1 Cache)

- Checks the `textCache` Firestore collection for the `cacheKey`.
- If a cached entry is found containing a `url`, verifies its underlying Firestore result document is not deleted or rated "bad".
- On a valid cache hit, it increments the specific result's view count and immediately returns a `302` redirect.

### 5. Bucket Fallback Lookup (L2 Cache)

- If the global cache misses, it searches the target bucket's `results` subcollection for any existing completed, valid text results.
- Looks for matching `resolvedPrompt` and `variables`.
- Prefers results with a `good` rating.
- If a match is found locally in the bucket, it promotes this result back into the Global `textCache`, increments its views, and returns a `302` redirect.

### 6. Concurrency Control (Thundering Herd Protection)

If both caches miss, the function uses a **Distributed Lock** via Firestore Transactions to ensure only one function instance handles generation for the exact same `cacheKey`.

- Runs a Firestore transaction against the `textCache` document.
- **Lock Acquisition**: If the cache document does not exist, or its status is not `processing` (or if a `processing` lock is stale > 60 seconds), the instance takes the lock by writing `status: "processing"` and `lockedAt: Timestamp.now()`.
- **Waiting (Non-Leaders)**: If another instance holds the lock, the function will not generate. Instead, it listens to the `textCache` document via `onSnapshot` for up to **55 seconds**.
  - If the leader completes and updates the document with a URL, the waiter increments the view count and redirects to the URL.
  - If the timeout expires or the leader fails, the waiting instance falls back to taking over the lock and generating the text itself.

### 7. Execution and Generation

- Only the "leader" instance performs generation.
- Constructs a `MediaJob` document placeholder.
- Calls `executeGeneration(job)` utilizing internal generator services.
- Merges generation metadata (models used, processed prompt, variables) for record-keeping.

### 8. Storage and Result Caching

- Saves the final generated document into the Bucket's `results` subcollection with a `completed` status and initial `views: 1`.
- Updates the `textCache` document globally, resolving the `processing` lock by setting the text `url`, removing `lockedAt`, and updating status to `completed`.
- Issues a `302` redirect to the newly generated URL.

### 9. Error Recovery

- If generation fails, sets the cache document status to `failed` and clears the lock. This allows subsequent requests to retry.
- Dynamically renders an SVG summarizing the error string to ensure the frontend still receives an content-type, even on error, which prevents broken tags in UI.
