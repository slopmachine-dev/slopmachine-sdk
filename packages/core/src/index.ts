export interface SlopImageOptions {
  bucketId: string;
  prompt?: string;
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
    prompt,
    aspectRatio = "1:1",
    model,
    variables = {},
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage",
  } = options;

  const finalPrompt = interpolatePrompt(prompt, variables);

  const params = new URLSearchParams({
    bucketId,
    aspectRatio: String(aspectRatio),
    ...(model && { model }),
  });

  if (finalPrompt) {
    params.set("prompt", finalPrompt);
  }

  if (Object.keys(variables).length > 0) {
    params.set("variables", JSON.stringify(variables));
  }

  return `${baseUrl}?${params.toString()}`;
}
