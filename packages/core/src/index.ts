export interface SlopImageOptions {
  /**
   * The unique identifier of your Slop Machine bucket.
   */
  bucketId: string;
  /**
   * The specific version of the prompt/settings to use.
   * If omitted, the latest version will be used.
   */
  version?: number;
  /**
   * Result ID to retrieve a specific previously generated image
   * instead of generating a new one.
   */
  resultId?: string;
  /**
   * The aspect ratio of the generated image. Defaults to "1:1".
   * Common values: "1:1", "16:9", "9:16", "4:3", "3:4".
   */
  aspectRatio?: string;
  /**
   * The AI model to use for generation.
   * Overrides the default model specified in the bucket settings.
   */
  model?: "gemini" | "gemini-flash" | "gemini-pro" | "imagen";
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A photo of a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * The base URL for the Slop Machine API.
   * Defaults to the production URL. Useful for testing against local deployments.
   */
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
