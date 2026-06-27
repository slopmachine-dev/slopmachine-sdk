---
description: Reference documentation for the Slop Machine Upload Temp Attachment API.
---

# Upload Temp Attachment API

The Upload Temp Attachment API is an endpoint to help you temporarily store file attachments. These attachments can then be passed to the Render APIs via the `attachments` query parameter, enabling dynamic content generation using user-provided media.

## Endpoint Details

- **Method**: `POST`
- **Base URL**: `https://us-central1-slopmachine-12bfb.cloudfunctions.net/uploadTempAttachment`
- **Authentication**: Publicly accessible
- **File Limit**: 10MB per attachment.
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`.

## How It Works

1. Convert your file (e.g. from an `<input type="file" />`) to a base64 encoded string.
2. Call the `uploadTempAttachment` Firebase Callable Function with the base64 string and its `mimeType`.
3. The function validates the file size and type. If successful, it uploads the file to a temporary storage location.
4. The function returns an object containing the `url` of the uploaded file.
5. You can then pass this URL as a string in the `attachments` array parameter to the `renderImage`, `renderVideo`, or `renderText` endpoints.

### Important Notes

- Attachments uploaded via this endpoint are **temporary** and will automatically expire and be deleted after a short period (typically designed to be just long enough for your render request to complete).
- Ensure your base64 string does not include the data URL scheme prefix (e.g., `data:image/jpeg;base64,`), just the raw base64 data.

## Example

```typescript
// Example using Firebase Client SDK
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const uploadTempAttachment = httpsCallable(functions, "uploadTempAttachment");

async function uploadFile(file: File) {
  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the prefix from data URL
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Call the function
  const response = await uploadTempAttachment({
    data: base64Data,
    mimeType: file.type,
  });

  // The resulting URL to pass in your attachments array
  return response.data.url;
}
```
