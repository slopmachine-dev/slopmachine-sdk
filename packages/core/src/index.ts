export interface SlopImageOptions {
  bucketId: string;
  version?: number;
  resultId?: string;
  aspectRatio?: string;
  model?: "gemini" | "gemini-flash" | "gemini-pro" | "imagen";
  variables?: Record<string, string | number | undefined | null>;
  baseUrl?: string;
}

export function interpolatePrompt(
  prompt?: string,
  variables?: Record<string, string | number | undefined | null>,
): string {
  if (!prompt) return "";
  let text = prompt;
  if (!variables) return text;

  Object.keys(variables).forEach((key) => {
    const value = variables[key];
    if (value !== undefined && value !== null) {
      text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
  });
  return text;
}

export function buildImageUrl(options: SlopImageOptions): string {
  const {
    bucketId,
    version,
    resultId,
    aspectRatio = "1:1",
    model,
    variables = {},
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage",
  } = options;

  const params = new URLSearchParams();
  params.set("bucketId", bucketId);

  if (aspectRatio) {
    params.set("aspectRatio", aspectRatio);
  }

  if (model) {
    params.set("model", model);
  }
  if (version) {
    params.set("version", String(version));
  }
  if (resultId) {
    params.set("resultId", resultId);
  }

  if (Object.keys(variables).length > 0) {
    params.set("variables", JSON.stringify(variables));
  }

  return `${baseUrl}?${params.toString()}`;
}
