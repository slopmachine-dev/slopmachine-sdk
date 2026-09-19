---
description: Reference documentation for the Slop Machine Rate Result API and SDK function.
---

# Rate Result API

The Rate Result API and SDK utility allow rating previously generated results from Slop Machine as `"good"`, `"bad"`, or clearing their rating (`null`).

Ratings allow you to filter outputs and guide feedback loops in your pipelines and buckets. Results rated `"bad"` are automatically excluded from public cache resolution and subsequent requests.

## Domain Whitelisting

To protect against unauthorized rating manipulation, the backend verifies the requesting domain against the result's parent bucket or pipeline:
- If the parent bucket or pipeline defines **Whitelisted Domains**, rating requests must include an `Origin` or `Referer` matching one of the whitelisted hostnames. Requests from non-whitelisted domains or requests lacking an origin/referer header will receive a `403 Forbidden` (`Domain not authorized`).
- If no domain whitelist is set for the parent bucket or pipeline, ratings can be submitted freely.

## Using the SDK

The `rateResult` function is exported by `@slopmachine/core`, `@slopmachine/react`, and `@slopmachine/svelte`.

### Signature

```typescript
function rateResult(
  resultId: string,
  rating: "good" | "bad" | null,
  options?: { baseUrl?: string }
): Promise<{ success: boolean; resultId: string; rating: "good" | "bad" | null }>;
```

### Example: Rating a Result

```typescript
import { rateResult } from "@slopmachine/core";
// or: import { rateResult } from "@slopmachine/react";
// or: import { rateResult } from "@slopmachine/svelte";

// Rate a result positively
await rateResult("res_123456", "good");

// Rate a result negatively (hides it from public cache)
await rateResult("res_123456", "bad");

// Clear/reset an existing rating
await rateResult("res_123456", null);
```

## HTTP Endpoint Details

- **Method**: `POST` (or `PATCH`)
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/rateResult`
- **Headers**:
  - `Content-Type: application/json`
  - `Origin` or `Referer`: Required if the parent entity has whitelisted domains configured.
- **Body**:
  ```json
  {
    "resultId": "res_123456",
    "rating": "good"
  }
  ```

### Response

`200 OK`
```json
{
  "success": true,
  "resultId": "res_123456",
  "rating": "good"
}
```

### Errors

- `400 Bad Request`: Missing `resultId` or invalid `rating` value.
- `403 Forbidden`: `Domain not authorized` (request does not originate from an allowed domain).
- `404 Not Found`: Result not found.
- `405 Method Not Allowed`: HTTP method is not `POST` or `PATCH`.
