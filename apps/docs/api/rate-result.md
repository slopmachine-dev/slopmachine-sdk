---
description: Reference documentation for the Slop Machine Rate Result API and SDK function.
---

# Rate Result API

The Rate Result API and SDK utility allow rating previously generated results from Slop Machine as `"good"`, `"bad"`, or clearing their rating (`null`).

Ratings allow you to filter outputs and guide feedback loops in your pipelines and buckets. Results rated `"bad"` are automatically excluded from public cache resolution and subsequent requests.

> [!WARNING]
> **Server-side use only:** Rating a result requires a Slop Machine API key with write access to the owning silo. Never expose your API key in browser code.

## Using the SDK

The `rateResult` function is exported by `@slopmachine/core` for server-side environments.

### Signature

```typescript
function rateResult(
  resultId: string,
  rating: "good" | "bad" | null,
  options: { apiKey: string; apiBaseUrl?: string }
): Promise<{ success: boolean; resultId: string; rating: "good" | "bad" | null }>;
```

### Example: Rating a Result (Server-Side)

```typescript
import { rateResult } from "@slopmachine/core";

const apiKey = process.env.SLOPMACHINE_API_KEY!;

// Rate a result positively
await rateResult("res_123456", "good", { apiKey });

// Rate a result negatively (hides it from public cache)
await rateResult("res_123456", "bad", { apiKey });

// Clear/reset an existing rating
await rateResult("res_123456", null, { apiKey });
```

## HTTP Endpoint Details

- **Method**: `POST`
- **URL**: `https://slopmachine.dev/api/results/{resultId}/rating`
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <your-api-key>` (or `Authorization: Bearer <id-token>`)
- **Body**:
  ```json
  {
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
- `401 Unauthorized`: Missing or invalid credentials.
- `403 Forbidden`: Authenticated caller does not have write access to the result's silo.
- `404 Not Found`: Result not found.
