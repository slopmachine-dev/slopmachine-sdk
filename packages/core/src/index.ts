import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Aspect ratios supported by the renderImage endpoint.
 * Keep in sync with `AspectRatioSchema` in the backend's `@pixerate/schemas`.
 */
export type ImageAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

/**
 * Aspect ratios supported by the renderVideo endpoint.
 * Keep in sync with `VideoAspectRatioSchema` in the backend's `@pixerate/schemas`.
 */
export type VideoAspectRatio = "9:16" | "16:9";

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
   * The unique identifier of the pipeline to execute.
   */
  pipelineId: string;
  /**
   * Optional silo identifier for direct pipeline path resolution.
   */
  siloId?: string;
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
   * The unique identifier of the pipeline to execute.
   */
  pipelineId: string;
  /**
   * Optional silo identifier for direct pipeline path resolution.
   */
  siloId?: string;
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
   * Required when using a bucket unless pipelineId is provided.
   */
  bucketId?: string;
  /**
   * The unique identifier of your Slop Machine pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineId?: string;
  /**
   * Optional silo identifier.
   */
  siloId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata to attach to the generation request / result document.
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
   * Overrides the AI model used for generation (e.g. "gemini-flash").
   * If omitted, the bucket version's configured model is used.
   */
  model?: string;
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

/**
 * Error raised when Slop Machine fails to generate or serve a result.
 */
export class SlopMachineError extends Error {
  /**
   * The HTTP status returned by the API (e.g. `400` for validation errors,
   * `500` for generation failures). Undefined when the media element itself
   * failed to load and no API status is known.
   */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SlopMachineError";
    this.status = status;
  }
}

/**
 * Checks that a render URL resolves successfully, without downloading the media body.
 *
 * The `HEAD` request is also a deliberate warm-up: it tells the backend a result
 * is about to be requested, so generation starts immediately even if the media
 * element defers its own `GET` (e.g. `loading="lazy"`). Results are cached by
 * input, so the HEAD and the later GET never produce duplicate generations.
 *
 * Sends a `HEAD` request. If the API responds with an error status, the error
 * detail is read from the JSON response body and thrown as a `SlopMachineError`.
 * Network-level failures (offline, CORS, aborted) are rethrown as-is, so callers
 * can tell "the API reported an error" apart from "the check could not be made".
 *
 * @param url - A URL produced by `buildImageUrl`, `buildVideoUrl`, or `buildTextUrl`.
 * @param init - Optional `AbortSignal` to cancel the check.
 * @returns A promise that resolves if the URL is servable.
 */
export async function checkRenderUrl(
  url: string,
  init?: { signal?: AbortSignal },
): Promise<void> {
  const response = await fetch(url, { method: "HEAD", signal: init?.signal });
  if (response.ok) return;

  let message =
    response.statusText || `Request failed with status ${response.status}`;
  try {
    // HEAD responses have no body, so fetch again to read the error detail.
    const errorResponse = await fetch(url, { signal: init?.signal });
    const errorData = JSON.parse(await errorResponse.text());
    if (typeof errorData.error === "string") {
      message = errorData.error;
    } else if (typeof errorData.error?.message === "string") {
      message = errorData.error.message;
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    // Otherwise fall back to the status text
  }
  throw new SlopMachineError(message, response.status);
}

export interface RenderUrlMonitor {
  /**
   * Starts checking `url`, cancelling any check for a different URL.
   * Reports an error if the API rejects the URL.
   */
  watch(url: string): void;
  /**
   * Call when the `<img>`/`<video>` element fires its `error` event for `url`.
   * Waits for the URL check so the API's error message and status are reported
   * when available, falling back to a `SlopMachineError(fallbackMessage)`.
   *
   * Pass the component's current URL only. This may run before `watch(url)`
   * (the element can fail before an effect runs), so it starts the check itself.
   */
  mediaFailed(url: string, fallbackMessage: string): void;
  /**
   * Cancels the current check. Pending results for it are discarded.
   */
  stop(): void;
}

/**
 * Low-level helper for framework components that render a media URL.
 *
 * A failing render URL is noticed twice: by the `HEAD` check (which can read the
 * API's error detail) and by the media element's `error` event (which usually
 * fires first but carries no detail). The monitor shares one check per URL
 * between both, reports at most one error per URL, and drops results for URLs
 * that are no longer current.
 *
 * @param onError - Called at most once per watched URL with the best available error.
 */
export function createRenderUrlMonitor(
  onError: (error: SlopMachineError, url: string) => void,
): RenderUrlMonitor {
  let current: {
    url: string;
    controller: AbortController;
    result: Promise<SlopMachineError | null>;
  } | null = null;
  let reportedUrl: string | null = null;

  function check(url: string): Promise<SlopMachineError | null> {
    if (current?.url === url) return current.result;
    current?.controller.abort();
    const controller = new AbortController();
    const result = checkRenderUrl(url, { signal: controller.signal }).then(
      () => null,
      // Network, CORS and abort failures carry no API detail
      (err) => (err instanceof SlopMachineError ? err : null),
    );
    current = { url, controller, result };
    return result;
  }

  function report(error: SlopMachineError, url: string) {
    if (current?.url !== url || reportedUrl === url) return;
    reportedUrl = url;
    onError(error, url);
  }

  return {
    watch(url) {
      if (current?.url !== url) {
        current?.controller.abort();
        current = null;
        reportedUrl = null;
      }
      check(url).then((error) => {
        if (error) report(error, url);
      });
    },
    mediaFailed(url, fallbackMessage) {
      check(url).then((error) =>
        report(error ?? new SlopMachineError(fallbackMessage), url),
      );
    },
    stop() {
      current?.controller.abort();
      current = null;
    },
  };
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
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
 *
 * @param options - Configuration options for the image generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildImageUrl(options: SlopImageOptions): string {
  const {
    bucketId,
    pipelineId,
    siloId,
    prompt,
    metadata,
    version,
    resultId,
    aspectRatio = "1:1",
    model,
    variables = {},
    baseUrl,
    original,
    attachments,
  } = options;

  if (pipelineId) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineId", pipelineId);
    params.set("redirect", "true");

    if (siloId) params.set("siloId", siloId);
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
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage";
  const params = new URLSearchParams();
  if (bucketId) {
    params.set("bucketId", bucketId);
  }

  if (!resultId) {
    if (aspectRatio) {
      params.set("aspectRatio", aspectRatio);
    }
    if (model) {
      params.set("model", model);
    }
    if (version) {
      params.set("version", String(version));
    }

    if (original) {
      params.set("original", "true");
    }

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }

    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
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
   * Required when using a bucket unless pipelineId is provided.
   */
  bucketId?: string;
  /**
   * The unique identifier of your Slop Machine pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineId?: string;
  /**
   * Optional silo identifier.
   */
  siloId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata to attach to the generation request / result document.
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
   * If not specified, defaults to the bucket version's configured duration (or 4).
   */
  duration?: number;
  /**
   * The base URL for the Slop Machine API.
   * Defaults to the production URL. Useful for testing against local deployments.
   */
  baseUrl?: string;
  /**
   * If true, serves the original generated uncompressed asset directly from storage.
   */
  original?: boolean;
  /**
   * Array of runtime image attachments (URLs) to use with the video model.
   * Only allowed if the bucket version has runtime attachments enabled.
   */
  attachments?: string[];
}

/**
 * Builds the URL to render or stream an AI-generated video.
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
 *
 * @param options - Configuration options for the video generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildVideoUrl(options: SlopVideoOptions): string {
  const {
    bucketId,
    pipelineId,
    siloId,
    prompt,
    metadata,
    version,
    resultId,
    aspectRatio = "16:9",
    variables = {},
    duration,
    baseUrl,
    original,
    attachments,
  } = options;

  if (pipelineId) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineId", pipelineId);
    params.set("redirect", "true");

    if (siloId) params.set("siloId", siloId);
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

    if (original) {
      params.set("original", "true");
    }

    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }

    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
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
   * Required when using a bucket unless pipelineId is provided.
   */
  bucketId?: string;
  /**
   * The unique identifier of your Slop Machine pipeline.
   * Required when targeting a pipeline instead of a bucket.
   */
  pipelineId?: string;
  /**
   * Optional silo identifier.
   */
  siloId?: string;
  /**
   * Dynamic runtime prompt (used when targeting a pipeline).
   */
  prompt?: string;
  /**
   * Arbitrary user metadata to attach to the generation request / result document.
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
   * Overrides the AI model used for generation (e.g. "gemini-pro").
   * If omitted, the bucket version's configured model is used.
   */
  model?: string;
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
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
 *
 * @param options - Configuration options for the text generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildTextUrl(options: SlopTextOptions): string {
  const {
    bucketId,
    pipelineId,
    siloId,
    prompt,
    metadata,
    version,
    resultId,
    model,
    variables = {},
    baseUrl,
    attachments,
  } = options;

  if (pipelineId) {
    const endpoint =
      baseUrl ||
      "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline";
    const params = new URLSearchParams();
    params.set("pipelineId", pipelineId);
    params.set("sync", "true");

    if (siloId) params.set("siloId", siloId);
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
    if (model) {
      params.set("model", model);
    }
    if (version) {
      params.set("version", String(version));
    }
    if (Object.keys(variables).length > 0) {
      params.set("variables", JSON.stringify(variables));
    }
    if (metadata && Object.keys(metadata).length > 0) {
      params.set("metadata", JSON.stringify(metadata));
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Converts generated Markdown into sanitized HTML that is safe to inject into the DOM.
 *
 * Generated text can be steered by user-supplied prompts and variables, so the
 * HTML produced by `marked` is always passed through DOMPurify to strip scripts,
 * event handlers, and other active content.
 *
 * Without a DOM (e.g. during SSR) DOMPurify cannot sanitize and would return its
 * input unchanged, so the Markdown is returned HTML-escaped instead.
 *
 * @param markdown - The Markdown text returned by the renderText endpoint.
 * @returns A sanitized HTML string.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";
  const purifier = getPurifier();
  if (!purifier) return escapeHtml(markdown);
  const html = marked.parse(markdown, { async: false });
  return purifier.sanitize(html);
}

let purifierInstance: ReturnType<typeof DOMPurify> | undefined;

// Bind DOMPurify to `window` lazily: the default export is initialised at import
// time and stays unsupported forever if no DOM existed yet (e.g. jsdom set up later).
function getPurifier() {
  if (typeof window === "undefined") return undefined;
  purifierInstance ??= DOMPurify(window);
  return purifierInstance.isSupported ? purifierInstance : undefined;
}

/**
 * Builds a URL to execute or inspect a multi-step Pipeline from Slop Machine.
 *
 * @param options - Configuration options for the pipeline execution.
 * @returns A string containing the fully constructed URL.
 */
export function buildPipelineUrl(options: SlopPipelineOptions): string {
  const {
    pipelineId,
    siloId,
    prompt,
    variables = {},
    metadata = {},
    sync = true,
    redirect = false,
    resultId,
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline",
  } = options;

  const params = new URLSearchParams();
  params.set("pipelineId", pipelineId);

  if (siloId) params.set("siloId", siloId);
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
 * @param options - Execution parameters including the pipelineId and runtime prompt/variables/metadata.
 * @returns A promise resolving to the completed PipelineResult document.
 */
export async function executePipeline(
  options: ExecutePipelineOptions,
): Promise<PipelineResult> {
  const {
    pipelineId,
    siloId,
    prompt,
    variables,
    metadata,
    baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderPipeline",
  } = options;

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pipelineId,
      ...(siloId ? { siloId } : {}),
      ...(prompt ? { prompt } : {}),
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

export type ResultRating = "good" | "bad" | null;

export interface RateResultOptions {
  /**
   * Base URL for the rateResult cloud function endpoint.
   */
  baseUrl?: string;
}

export interface RateResultResponse {
  success: boolean;
  resultId: string;
  rating: ResultRating;
}

/**
 * Rates a previously generated result as "good", "bad", or clears its rating (null).
 *
 * The rating change is applied on the backend only if the request originates
 * from an authorized domain (or if no domain whitelist is configured for the parent bucket/pipeline).
 *
 * @param resultId - The unique ID of the result to rate.
 * @param rating - The rating to apply ("good", "bad", or null to clear).
 * @param options - Optional configuration options including baseUrl.
 * @returns A promise resolving to the rating update response.
 */
export async function rateResult(
  resultId: string,
  rating: ResultRating,
  options?: RateResultOptions,
): Promise<RateResultResponse> {
  if (!resultId) {
    throw new Error("resultId is required");
  }

  const endpoint =
    options?.baseUrl ||
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/rateResult";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resultId,
      rating,
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
    throw new Error(`Failed to rate result (${response.status}): ${errorDetail}`);
  }

  return (await response.json()) as RateResultResponse;
}
