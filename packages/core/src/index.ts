export interface SlopMachineOptions {
  prompt: string;
  aspectRatio?: string;
  variables?: Record<string, string | number | undefined | null>;
  baseUrl?: string;
}

export function interpolatePrompt(
  prompt: string,
  variables?: Record<string, string | number | undefined | null>,
): string {
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

export function buildImageUrl(options: SlopMachineOptions): string {
  const {
    prompt,
    aspectRatio = "1:1",
    variables = {},
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage",
  } = options;

  const finalPrompt = interpolatePrompt(prompt, variables);

  const params = new URLSearchParams({
    prompt: finalPrompt,
    aspectRatio: String(aspectRatio),
  });

  return `${baseUrl}?${params.toString()}`;
}
