import { AspectRatio as ImageAspectRatio, VideoAspectRatio } from "@pixerate/schemas";
export type { ImageAspectRatio, VideoAspectRatio };

export interface PipelineStepResult {
  stepId: string;
  stepName?: string;
  type: string;
  outputUrl?: string;
  outputText?: string;
  outputData?: any;
  computeTimeMs?: number;
  fuelCost?: number;
  error?: string;
}

export interface PipelineResult {
  id: string;
  pipelineId: string;
  siloId: string;
  url?: string;
  text?: string;
  data?: any;
  resultType: string;
  status: "completed" | "failed" | "pending";
  stepResults: PipelineStepResult[];
  totalComputeTimeMs: number;
  totalFuelCost: number;
  metadata?: Record<string, any>;
  timestamp: any;
  error?: string;
}

export interface SlopPipelineOptions {
  /**
   * The secret pipeline key used for executing a pipeline.
   */
  pipelineKey: string;
  /**
   * Optional pipeline identifier.
   */
  pipelineId?: string;
  /**
   * Dynamic runtime prompt to feed into the pipeline.
   */
  prompt?: string;
  /**
   * Variables to interpolate into prompt or step configs.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * Arbitrary user metadata to attach to the pipeline result document.
   */
  metadata?: Record<string, any>;
  /**
   * Whether to wait for full execution (default true) or return a job ID immediately.
   */
  sync?: boolean;
  /**
   * Whether to redirect to the primary media output URL upon completion.
   */
  redirect?: boolean;
  /**
   * Result ID to retrieve a specific previously generated result.
   */
  resultId?: string;
  /**
   * Base URL for the renderPipeline cloud function endpoint.
   */
  baseUrl?: string;
}

export interface ExecutePipelineOptions {
  /**
   * The secret pipeline key used for executing a pipeline.
   */
  pipelineKey: string;
  /**
   * Dynamic runtime prompt to feed into the pipeline.
   */
  prompt?: string;
  /**
   * Variables to interpolate into prompt or step configs.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * Arbitrary user metadata to attach to the pipeline result document.
   */
  metadata?: Record<string, any>;
  /**
   * Base URL for the renderPipeline cloud function endpoint.
   */
  baseUrl?: string;
}

export interface SlopImageOptions {
  /**
   * The unique identifier of your Slop Machine bucket.
   * Required when using a bucket unless pipelineKey is provided.
   */
  bucketId?: string;
  /**
   * The secret pipeline key used for executing a pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineKey?: string;
  /**
   * Optional pipeline identifier.
   */
  pipelineId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata (used when targeting a pipeline).
   */
  metadata?: Record<string, any>;
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
  aspectRatio?: ImageAspectRatio;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A photo of a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * The target quality ("fast" or "high"). Only affects new generations and is ignored for caching.
   * Ignored if `model` is provided.
   * Defaults to "fast".
   */
  quality?: "fast" | "high";
  /**
   * The base URL for the Slop Machine API.
   * Defaults to the production URL. Useful for testing against local deployments.
   */
  baseUrl?: string;
  /**
   * If `true` (or `?raw=true`), bypasses the WebP optimized media and returns the original generated file (e.g., PNG/JPEG).
   * Defaults to false.
   */
  original?: boolean;
  /**
   * Array of attachment URLs to include with the request.
   */
  attachments?: string[];
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

/**
 * Builds a URL to render or retrieve an image from Slop Machine.
 *
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineKey`).
 *
 * @param options - Configuration options for the image generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildImageUrl(options: SlopImageOptions): string {
  const {
    bucketId,
    pipelineKey,
    pipelineId,
    prompt,
    metadata,
    version,
    resultId,
    aspectRatio = "1:1",
    quality = "fast",
    variables = {},
    baseUrl,
    original,
    attachments,
  } = options;

  if (pipelineKey) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineKey", pipelineKey);
    params.set("redirect", "true");

    if (pipelineId) params.set("pipelineId", pipelineId);
    if (prompt) params.set("prompt", prompt);
    if (resultId) params.set("resultId", resultId);
    if (aspectRatio) params.set("aspectRatio", aspectRatio);

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }
    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
    }

    return `${endpoint}?${params.toString()}`;
  }

  const endpoint =
    baseUrl ||
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage";
  const params = new URLSearchParams();
  if (bucketId) {
    params.set("bucketId", bucketId);
  }

  if (!resultId) {
    if (aspectRatio) {
      params.set("aspectRatio", aspectRatio);
    }
    if (version) {
      params.set("version", String(version));
    }
    if (quality && quality !== "fast") {
      params.set("quality", quality);
    } else if (quality === "fast") {
      params.set("quality", "fast");
    }

    if (original) {
      params.set("original", "true");
    }

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }

    if (attachments && attachments.length > 0) {
      params.set("attachments", JSON.stringify(attachments));
    }
  } else {
    params.set("resultId", resultId);
  }

  return `${endpoint}?${params.toString()}`;
}

/**
 * Preloads an image from Slop Machine into the browser's cache.
 * Useful for ensuring images are ready before displaying them.
 *
 * @param options - Configuration options for the image generation.
 * @returns A promise that resolves when the image has been loaded.
 */
export function preloadImage(options: SlopImageOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
    img.src = buildImageUrl(options);
  });
}

export interface SlopVideoOptions {
  /**
   * The unique identifier of your Slop Machine bucket.
   * Required when using a bucket unless pipelineKey is provided.
   */
  bucketId?: string;
  /**
   * The secret pipeline key used for executing a pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineKey?: string;
  /**
   * Optional pipeline identifier.
   */
  pipelineId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata (used when targeting a pipeline).
   */
  metadata?: Record<string, any>;
  /**
   * The specific version of the prompt/settings to use.
   * If omitted, the latest version will be used.
   */
  version?: number;
  /**
   * Result ID to retrieve a specific previously generated video
   * instead of generating a new one.
   */
  resultId?: string;
  /**
   * The aspect ratio of the generated video. Defaults to "16:9".
   * Common values: "1:1", "16:9", "9:16", "4:3", "3:4".
   */
  aspectRatio?: VideoAspectRatio;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A video of a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * The duration of the generated video in seconds.
   * Must be between 4 and 8. Defaults to 4.
   */
  duration?: number;
  /**
   * The target quality ("fast" or "high"). Only affects new generations and is ignored for caching.
   * Ignored if `model` is provided.
   * Defaults to "fast".
   */
  quality?: "fast" | "high";
  /**
   * The base URL for the Slop Machine API.
   * Defaults to the production URL. Useful for testing against local deployments.
   */
  baseUrl?: string;
  /**
   * If `true` (or `?raw=true`), bypasses the WebP optimized media and returns the original generated file.
   * Defaults to false.
   */
  original?: boolean;
  /**
   * Array of attachment URLs to include with the request.
   */
  attachments?: string[];
}

/**
 * Builds a URL to render or retrieve a video from Slop Machine.
 *
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineKey`).
 *
 * @param options - Configuration options for the video generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildVideoUrl(options: SlopVideoOptions): string {
  const {
    bucketId,
    pipelineKey,
    pipelineId,
    prompt,
    metadata,
    version,
    resultId,
    aspectRatio = "16:9",
    quality = "fast",
    variables = {},
    duration = 4,
    baseUrl,
    original,
    attachments,
  } = options;

  if (pipelineKey) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineKey", pipelineKey);
    params.set("redirect", "true");

    if (pipelineId) params.set("pipelineId", pipelineId);
    if (prompt) params.set("prompt", prompt);
    if (resultId) params.set("resultId", resultId);
    if (aspectRatio) params.set("aspectRatio", aspectRatio);
    if (duration) params.set("duration", String(duration));

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }
    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
    }

    return `${endpoint}?${params.toString()}`;
  }

  const endpoint =
    baseUrl ||
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderVideo";
  const params = new URLSearchParams();
  if (bucketId) {
    params.set("bucketId", bucketId);
  }

  if (!resultId) {
    if (aspectRatio) {
      params.set("aspectRatio", aspectRatio);
    }
    if (version) {
      params.set("version", String(version));
    }
    if (duration) {
      params.set("duration", String(duration));
    }
    if (quality) {
      params.set("quality", quality);
    }

    if (original) {
      params.set("original", "true");
    }

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }

    if (attachments && attachments.length > 0) {
      params.set("attachments", JSON.stringify(attachments));
    }
  } else {
    params.set("resultId", resultId);
  }

  return `${endpoint}?${params.toString()}`;
}

/**
 * Preloads a video from Slop Machine into the browser's cache.
 * Useful for ensuring videos are ready before displaying them.
 *
 * @param options - Configuration options for the video generation.
 * @returns A promise that resolves when the video preload request has been initiated.
 */
export function preloadVideo(options: SlopVideoOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    fetch(buildVideoUrl(options), { mode: "no-cors" })
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

export interface SlopTextOptions {
  /**
   * The unique identifier of your Slop Machine bucket.
   * Required when using a bucket unless pipelineKey is provided.
   */
  bucketId?: string;
  /**
   * The secret pipeline key used for executing a pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineKey?: string;
  /**
   * Optional pipeline identifier.
   */
  pipelineId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata (used when targeting a pipeline).
   */
  metadata?: Record<string, any>;
  /**
   * The specific version of the prompt/settings to use.
   * If omitted, the latest version will be used.
   */
  version?: number;
  /**
   * Result ID to retrieve a specific previously generated text
   * instead of generating a new one.
   */
  resultId?: string;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A story about a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * The base URL for the Slop Machine API.
   * Defaults to the production URL. Useful for testing against local deployments.
   */
  baseUrl?: string;
  /**
   * Array of attachment URLs to include with the request.
   */
  attachments?: string[];
}

/**
 * Builds a URL to render or retrieve text from Slop Machine.
 *
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineKey`).
 *
 * @param options - Configuration options for the text generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildTextUrl(options: SlopTextOptions): string {
  const {
    bucketId,
    pipelineKey,
    pipelineId,
    prompt,
    metadata,
    version,
    resultId,
    variables = {},
    baseUrl,
    attachments,
  } = options;

  if (pipelineKey) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineKey", pipelineKey);
    params.set("sync", "true");

    if (pipelineId) params.set("pipelineId", pipelineId);
    if (prompt) params.set("prompt", prompt);
    if (resultId) params.set("resultId", resultId);

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }
    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
    }

    return `${endpoint}?${params.toString()}`;
  }

  const endpoint =
    baseUrl ||
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderText";
  const params = new URLSearchParams();
  if (bucketId) {
    params.set("bucketId", bucketId);
  }

  if (!resultId) {
    if (version) {
      params.set("version", String(version));
    }
    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }
    if (attachments && attachments.length > 0) {
      params.set("attachments", JSON.stringify(attachments));
    }
  } else {
    params.set("resultId", resultId);
  }

  return `${endpoint}?${params.toString()}`;
}

/**
 * Preloads text from Slop Machine into the browser's cache.
 * Useful for ensuring text is ready before displaying it.
 *
 * @param options - Configuration options for the text generation.
 * @returns A promise that resolves when the text preload request has been initiated.
 */
export function preloadText(options: SlopTextOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    fetch(buildTextUrl(options), { mode: "no-cors" })
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

/**
 * Builds a URL to execute or inspect a multi-step Pipeline from Slop Machine.
 *
 * @param options - Configuration options for the pipeline execution.
 * @returns A string containing the fully constructed URL.
 */
export function buildPipelineUrl(options: SlopPipelineOptions): string {
  const {
    pipelineKey,
    pipelineId,
    prompt,
    variables = {},
    metadata = {},
    sync = true,
    redirect = false,
    resultId,
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline",
  } = options;

  const params = new URLSearchParams();
  params.set("pipelineKey", pipelineKey);

  if (pipelineId) params.set("pipelineId", pipelineId);
  if (prompt) params.set("prompt", prompt);
  if (resultId) params.set("resultId", resultId);
  if (sync !== undefined) params.set("sync", String(sync));
  if (redirect) params.set("redirect", "true");

  if (Object.keys(variables).length > 0) {
    params.set("variables", JSON.stringify(variables));
  }
  if (Object.keys(metadata).length > 0) {
    params.set("metadata", JSON.stringify(metadata));
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Executes a Slop Machine multi-step Pipeline programmatically and returns the full typed result payload.
 *
 * @param options - Execution parameters including the pipelineKey and runtime prompt/variables/metadata.
 * @returns A promise resolving to the completed PipelineResult document.
 */
export async function executePipeline(
  options: ExecutePipelineOptions,
): Promise<PipelineResult> {
  const {
    pipelineKey,
    prompt,
    variables,
    metadata,
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline",
  } = options;

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pipelineKey}`,
    },
    body: JSON.stringify({
      pipelineKey,
      prompt,
      variables,
      metadata,
      sync: true,
    }),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorDetail = errorJson.error;
      }
    } catch {
      // Use statusText
    }
    throw new Error(
      `Pipeline execution failed (${response.status}): ${errorDetail}`,
    );
  }

  return (await response.json()) as PipelineResult;
}

/**
 * Uploads a base64 encoded file as a temporary attachment to be used in generation requests.
 *
 * @param base64 - The base64 encoded file data (without the data:mime/type;base64, prefix).
 * @param mimeType - The MIME type of the file.
 * @returns A promise that resolves to an object containing the URL of the uploaded attachment.
 */
export async function uploadTempAttachment(
  base64: string,
  mimeType: string,
): Promise<{ url: string }> {
  const response = await fetch(
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/uploadTempAttachment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { base64, mimeType } }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to upload attachment: ${response.statusText}`);
  }
  const json = await response.json();
  if (json.error) {
    throw new Error(
      `Failed to upload attachment: ${json.error.message || JSON.stringify(json.error)}`,
    );
  }
  return { url: json.result.url };
}
