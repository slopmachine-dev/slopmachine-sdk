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

/**
 * Union of all supported media aspect ratios across image and video endpoints.
 */
export type AspectRatio = ImageAspectRatio | VideoAspectRatio;

const API_URL = "https://us-central1-slopmachine-12bfb.cloudfunctions.net";

// A per-call `baseUrl` is a full endpoint URL that replaces the default one
function endpoint(name: string, baseUrl?: string): string {
  return baseUrl || `${API_URL}/${name}`;
}

type QueryValue = string | number | boolean | object | null | undefined;

// Serializes params in the given order, skipping empty values (undefined, null,
// false, "", 0, and empty objects/arrays); objects are JSON-encoded. The order
// is part of each URL's cache identity, so don't reorder entries in callers
// (see test/url-stability.test.ts).
function toQuery(entries: Array<[string, QueryValue]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (!value) continue;
    if (typeof value === "object") {
      if (Object.keys(value).length > 0) params.set(key, JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export interface PipelineQueryOptions {
  siloId?: string;
  prompt?: string;
  resultId?: string;
  variables?: Record<string, string | number | undefined | null>;
  metadata?: Record<string, any>;
  version?: number;
  aspectRatio?: AspectRatio | Record<string, AspectRatio>;
  duration?: number | Record<string, number>;
  attachments?: string[] | Record<string, string[]>;
}

// Query for a component-driven pipeline run: media redirects to the output, text waits for it
function pipelineQuery(
  pipelineId: string,
  mode: "redirect" | "sync",
  options: PipelineQueryOptions,
): string {
  return toQuery([
    ["pipelineId", pipelineId],
    [mode, true],
    ["siloId", options.siloId],
    ["prompt", options.prompt],
    ["resultId", options.resultId],
    ["variables", options.variables],
    ["metadata", options.metadata],
    ["version", options.version],
    ["aspectRatio", options.aspectRatio],
    ["duration", options.duration],
    ["attachments", options.attachments],
  ]);
}

const warnedOptions = new Set<string>();

// Components rebuild URLs on every render, so each distinct warning is logged once.
function warnOnce(id: string, message: string): void {
  if (warnedOptions.has(id)) return;
  warnedOptions.add(id);
  console.warn(message);
}

// Mirrors what `toQuery` would serialize: empty arrays/objects and falsy values don't count.
function isOptionSet(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
}

function isStepMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// renderPipeline has no equivalent for these bucket-only options, so they are
// dropped from the URL; warn once per option so the omission isn't silent.
function warnIgnoredPipelineOptions(
  options: object,
  keys: readonly string[],
): void {
  for (const key of keys) {
    if (!isOptionSet((options as Record<string, unknown>)[key])) continue;
    warnOnce(
      `pipeline:${key}`,
      `[slopmachine] "${key}" is only supported for buckets (bucketId) and is ignored when pipelineId is set.`,
    );
  }
}

// Per-step `Record<stepId, …>` maps only make sense for pipelines. In bucket
// mode they are dropped (never JSON-encoded into the URL) with a one-time
// warning. Returns `undefined` for a dropped map, otherwise the value unchanged,
// so URLs for valid bucket inputs are not affected.
function dropStepMap<T>(
  key: string,
  value: T,
): Exclude<T, Record<string, unknown>> | undefined {
  if (!isStepMap(value)) return value as Exclude<T, Record<string, unknown>>;
  if (isOptionSet(value)) {
    warnOnce(
      `bucket-map:${key}`,
      `[slopmachine] A per-step map for "${key}" is only supported for pipelines (pipelineId) and is ignored when bucketId is set.`,
    );
  }
  return undefined;
}

// Options the bucket endpoint for this media type doesn't accept at all.
function warnIgnoredBucketOptions(
  options: object,
  keys: readonly string[],
): void {
  for (const key of keys) {
    if (!isOptionSet((options as Record<string, unknown>)[key])) continue;
    warnOnce(
      `bucket:${key}`,
      `[slopmachine] "${key}" is only supported for pipelines (pipelineId) and is ignored when bucketId is set.`,
    );
  }
}

/**
 * Resolves an `aspectRatio` option to a CSS `aspect-ratio` value (e.g. `"16/9"`)
 * for sizing a component's layout box before the media loads.
 *
 * Rule:
 * - A ratio string (e.g. `"16:9"`) is used as-is.
 * - A per-step `Record<stepId, AspectRatio>` map uses its **last** non-empty
 *   value in `Object.values()` order (insertion order for non-numeric keys),
 *   on the assumption that the final step produces the rendered media.
 * - Anything else (unset, empty map) uses `fallback`.
 *
 * This only affects layout: it never changes what is sent to the API.
 *
 * @param aspectRatio - The component's `aspectRatio` option.
 * @param fallback - The ratio to use when none can be resolved (e.g. `"1:1"` for images, `"16:9"` for videos).
 * @returns The ratio with `:` replaced by `/`, ready for the CSS `aspect-ratio` property.
 */
export function resolveCssAspectRatio(
  aspectRatio: AspectRatio | Record<string, AspectRatio> | null | undefined,
  fallback: AspectRatio,
): string {
  let ratio: string = fallback;
  if (typeof aspectRatio === "string" && aspectRatio.length > 0) {
    ratio = aspectRatio;
  } else if (isStepMap(aspectRatio)) {
    const values = Object.values(aspectRatio).filter(
      (v): v is AspectRatio => typeof v === "string" && v.length > 0,
    );
    if (values.length > 0) ratio = values[values.length - 1];
  }
  return ratio.replace(":", "/");
}

export interface PipelineStepResult {
  stepId: string;
  stepName?: string;
  outputKey?: string;
  type: string;
  outputUrl?: string;
  outputText?: string;
  outputData?: any;
  computeTimeMs?: number;
  fuelCost?: number;
  error?: string;
  warnings?: string[];
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
  /**
   * Dictionary of step results keyed by `stepId` and `outputKey` (when present)
   * for direct multi-output lookup (e.g. `result.steps.heroVideo?.outputUrl`).
   */
  steps?: Record<string, PipelineStepResult>;
  totalComputeTimeMs: number;
  totalFuelCost: number;
  metadata?: Record<string, any>;
  timestamp: any;
  error?: string;
}

/**
 * Maps a pipeline result's `stepResults` array into a dictionary keyed by
 * both `stepId` and `outputKey` (when present) for convenient multi-output lookup.
 *
 * @param resultOrSteps - A `PipelineResult` object or `PipelineStepResult[]` array.
 * @returns A dictionary mapping each step's `stepId` and `outputKey` to its `PipelineStepResult`.
 */
export function mapStepResults(
  resultOrSteps:
    | Pick<PipelineResult, "stepResults">
    | PipelineStepResult[]
    | null
    | undefined,
): Record<string, PipelineStepResult> {
  const list = Array.isArray(resultOrSteps)
    ? resultOrSteps
    : resultOrSteps?.stepResults;
  const steps: Record<string, PipelineStepResult> = {};
  if (!Array.isArray(list)) return steps;
  for (const step of list) {
    if (!step) continue;
    if (step.stepId) {
      steps[step.stepId] = step;
    }
    if (step.outputKey) {
      steps[step.outputKey] = step;
    }
  }
  return steps;
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
   * The specific version of the pipeline to execute or retrieve from.
   * If omitted, the pipeline's current version is used.
   */
  version?: number;
  /**
   * Runtime aspect ratio override(s) — either a single ratio string for a single-step
   * pipeline or a `Record<stepId, AspectRatio>` map for multi-step pipelines.
   */
  aspectRatio?: AspectRatio | Record<string, AspectRatio>;
  /**
   * Runtime duration override(s) in seconds — either a number for a single-step
   * pipeline or a `Record<stepId, number>` map for multi-step pipelines.
   */
  duration?: number | Record<string, number>;
  /**
   * Runtime attachment URLs — either a `string[]` array or a `Record<stepId, string[]>`
   * map for multi-step pipelines.
   */
  attachments?: string[] | Record<string, string[]>;
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
   * Full endpoint URL to send this request to instead of the default
   * production `renderPipeline` endpoint.
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
   * Result ID to retrieve a specific previously generated pipeline result.
   */
  resultId?: string;
  /**
   * The specific version of the pipeline to execute or retrieve from.
   * If omitted, the pipeline's current version is used.
   */
  version?: number;
  /**
   * Runtime aspect ratio override(s) — either a single ratio string for a single-step
   * pipeline or a `Record<stepId, AspectRatio>` map for multi-step pipelines.
   */
  aspectRatio?: AspectRatio | Record<string, AspectRatio>;
  /**
   * Runtime duration override(s) in seconds — either a number for a single-step
   * pipeline or a `Record<stepId, number>` map for multi-step pipelines.
   */
  duration?: number | Record<string, number>;
  /**
   * Runtime attachment URLs — either a `string[]` array or a `Record<stepId, string[]>`
   * map for multi-step pipelines.
   */
  attachments?: string[] | Record<string, string[]>;
  /**
   * Variables to interpolate into prompt or step configs.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * Arbitrary user metadata to attach to the pipeline result document.
   */
  metadata?: Record<string, any>;
  /**
   * Full endpoint URL to send this request to instead of the default
   * production `renderPipeline` endpoint.
   */
  baseUrl?: string;
  /**
   * Optional `AbortSignal` to cancel the pipeline execution request.
   */
  signal?: AbortSignal;
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
   * The aspect ratio of the generated image. For buckets, defaults to "1:1";
   * with `pipelineId`, nothing is sent unless set.
   * Common values: "1:1", "16:9", "9:16", "4:3", "3:4".
   * When `pipelineId` is set, may also be a `Record<stepId, AspectRatio>` map
   * (a map is ignored with a console warning for buckets).
   */
  aspectRatio?: ImageAspectRatio | Record<string, AspectRatio>;
  /**
   * Runtime duration override(s) in seconds when targeting a pipeline (`pipelineId`).
   * Ignored with a console warning for buckets.
   */
  duration?: number | Record<string, number>;
  /**
   * Overrides the AI model used for generation.
   * If omitted, the bucket version's configured model is used.
   */
  model?: string;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A photo of a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * Full endpoint URL to send this request to instead of the default
   * production `renderImage` endpoint.
   * When `pipelineId` is set, this must be the `renderPipeline` endpoint.
   */
  baseUrl?: string;
  /**
   * If `true` (or `?raw=true`), bypasses the WebP optimized media and returns the original generated file (e.g., PNG/JPEG).
   * Defaults to false.
   */
  original?: boolean;
  /**
   * Array of attachment URLs (or a `Record<stepId, string[]>` map for pipelines) to include with the request.
   * A map is ignored with a console warning for buckets.
   */
  attachments?: string[] | Record<string, string[]>;
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

  // HEAD responses have no body, so fetch again to read the error detail.
  let message = statusMessage(response);
  try {
    const errorResponse = await fetch(url, { signal: init?.signal });
    message = await readErrorMessage(errorResponse, message);
  } catch (err) {
    if (isAbortError(err)) throw err;
    // Otherwise fall back to the status text
  }
  throw new SlopMachineError(message, response.status);
}

/**
 * Fetches generated text from a URL produced by `buildTextUrl`.
 *
 * Bypasses the HTTP cache, so remounting always shows the latest result.
 *
 * @param url - A URL produced by `buildTextUrl`.
 * @param init - Optional `AbortSignal` to cancel the request.
 * @returns The generated text (usually Markdown; see `renderMarkdown`).
 * @throws `SlopMachineError` with the API's message and HTTP `status` if generation
 *   fails, or without a status if the request could not be made. Aborts are rethrown as-is.
 */
export async function fetchRenderedText(
  url: string,
  init?: { signal?: AbortSignal },
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: init?.signal });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new SlopMachineError("Failed to load text");
  }
  if (!response.ok) {
    throw new SlopMachineError(
      await readErrorMessage(response, statusMessage(response)),
      response.status,
    );
  }
  return response.text();
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function statusMessage(response: Response): string {
  return response.statusText || `Request failed with status ${response.status}`;
}

// Reads `{ error: string }` or `{ error: { message } }` from an API error body
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorData = JSON.parse(await response.text());
    if (typeof errorData.error === "string") return errorData.error;
    if (typeof errorData.error?.message === "string") {
      return errorData.error.message;
    }
  } catch (err) {
    if (isAbortError(err)) throw err;
    // Not JSON: use the fallback
  }
  return fallback;
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

  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      // split/join rather than a RegExp: keys may contain regex metacharacters
      // and values may contain `$` replacement patterns
      text = text.split(`{${key}}`).join(String(value));
    }
  }
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
  const { bucketId, pipelineId, resultId, baseUrl } = options;

  if (pipelineId) {
    warnIgnoredPipelineOptions(options, ["model", "original"]);
    return `${endpoint("renderPipeline", baseUrl)}?${pipelineQuery(pipelineId, "redirect", options)}`;
  }

  // A dropped step map falls back to the default, exactly as if it were unset
  const { aspectRatio = "1:1" } = {
    aspectRatio: dropStepMap("aspectRatio", options.aspectRatio),
  };
  const attachments = dropStepMap("attachments", options.attachments);
  // renderImage has no duration parameter (pipelines only)
  warnIgnoredBucketOptions(options, ["duration"]);

  const query = resultId
    ? toQuery([
        ["bucketId", bucketId],
        ["resultId", resultId],
      ])
    : toQuery([
        ["bucketId", bucketId],
        ["aspectRatio", aspectRatio],
        ["model", options.model],
        ["version", options.version],
        ["original", options.original],
        ["variables", options.variables],
        ["metadata", options.metadata],
        ["attachments", attachments],
      ]);
  return `${endpoint("renderImage", baseUrl)}?${query}`;
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
   * The aspect ratio of the generated video. For buckets, defaults to "16:9";
   * with `pipelineId`, nothing is sent unless set.
   * When `pipelineId` is set, may also be a `Record<stepId, AspectRatio>` map
   * (a map is ignored with a console warning for buckets).
   */
  aspectRatio?: VideoAspectRatio | Record<string, AspectRatio>;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A video of a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * The duration of the generated video in seconds (or a `Record<stepId, number>` map for pipelines).
   * If not specified, defaults to the bucket/pipeline version's configured duration (or 4).
   * For buckets, a map is ignored with a console warning, and the value is ignored when `resultId` is set.
   */
  duration?: number | Record<string, number>;
  /**
   * Full endpoint URL to send this request to instead of the default
   * production `renderVideo` endpoint.
   * When `pipelineId` is set, this must be the `renderPipeline` endpoint.
   */
  baseUrl?: string;
  /**
   * If true, serves the original generated uncompressed asset directly from storage.
   */
  original?: boolean;
  /**
   * Array of runtime image attachments (URLs) or a `Record<stepId, string[]>` map for pipelines.
   * Only allowed if the bucket or pipeline step has runtime attachments enabled.
   * A map is ignored with a console warning for buckets.
   */
  attachments?: string[] | Record<string, string[]>;
}

/**
 * Builds the URL to render or stream an AI-generated video.
 * Supports both standard Buckets (via `bucketId`) and multi-step Pipelines (via `pipelineId`).
 *
 * @param options - Configuration options for the video generation.
 * @returns A string containing the fully constructed URL.
 */
export function buildVideoUrl(options: SlopVideoOptions): string {
  const { bucketId, pipelineId, resultId, baseUrl } = options;

  if (pipelineId) {
    warnIgnoredPipelineOptions(options, ["original"]);
    return `${endpoint("renderPipeline", baseUrl)}?${pipelineQuery(pipelineId, "redirect", options)}`;
  }

  // A dropped step map falls back to the default, exactly as if it were unset
  const { aspectRatio = "16:9" } = {
    aspectRatio: dropStepMap("aspectRatio", options.aspectRatio),
  };
  const duration = dropStepMap("duration", options.duration);
  const attachments = dropStepMap("attachments", options.attachments);

  const query = resultId
    ? toQuery([
        ["bucketId", bucketId],
        ["resultId", resultId],
      ])
    : toQuery([
        ["bucketId", bucketId],
        ["aspectRatio", aspectRatio],
        ["version", options.version],
        ["duration", duration],
        ["original", options.original],
        ["variables", options.variables],
        ["metadata", options.metadata],
        ["attachments", attachments],
      ]);
  return `${endpoint("renderVideo", baseUrl)}?${query}`;
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
   * Runtime aspect ratio override(s) when targeting a pipeline (`pipelineId`).
   * Ignored with a console warning for buckets.
   */
  aspectRatio?: AspectRatio | Record<string, AspectRatio>;
  /**
   * Runtime duration override(s) in seconds when targeting a pipeline (`pipelineId`).
   * Ignored with a console warning for buckets.
   */
  duration?: number | Record<string, number>;
  /**
   * Overrides the AI model used for generation.
   * If omitted, the bucket version's configured model is used.
   */
  model?: string;
  /**
   * Dynamic variables to interpolate into the prompt.
   * E.g., if prompt is "A story about a {color} dog", pass { color: "brown" }.
   */
  variables?: Record<string, string | number | undefined | null>;
  /**
   * Full endpoint URL to send this request to instead of the default
   * production `renderText` endpoint.
   * When `pipelineId` is set, this must be the `renderPipeline` endpoint.
   */
  baseUrl?: string;
  /**
   * Array of attachment URLs (or a `Record<stepId, string[]>` map for pipelines) to include with the request.
   * A map is ignored with a console warning for buckets.
   */
  attachments?: string[] | Record<string, string[]>;
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
  const { bucketId, pipelineId, resultId, baseUrl } = options;

  if (pipelineId) {
    warnIgnoredPipelineOptions(options, ["model"]);
    return `${endpoint("renderPipeline", baseUrl)}?${pipelineQuery(pipelineId, "sync", options)}`;
  }

  // renderText has no aspectRatio or duration parameters (pipelines only)
  warnIgnoredBucketOptions(options, ["aspectRatio", "duration"]);
  const attachments = dropStepMap("attachments", options.attachments);

  const query = resultId
    ? toQuery([
        ["bucketId", bucketId],
        ["resultId", resultId],
      ])
    : toQuery([
        ["bucketId", bucketId],
        ["model", options.model],
        ["version", options.version],
        ["variables", options.variables],
        ["metadata", options.metadata],
        ["attachments", attachments],
      ]);
  return `${endpoint("renderText", baseUrl)}?${query}`;
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
  const query = toQuery([
    ["pipelineId", options.pipelineId],
    ["siloId", options.siloId],
    ["prompt", options.prompt],
    ["resultId", options.resultId],
    // Always sent, including an explicit sync=false
    ["sync", String(options.sync ?? true)],
    ["redirect", options.redirect],
    ["variables", options.variables],
    ["metadata", options.metadata],
    ["version", options.version],
    ["aspectRatio", options.aspectRatio],
    ["duration", options.duration],
    ["attachments", options.attachments],
  ]);
  return `${endpoint("renderPipeline", options.baseUrl)}?${query}`;
}

/**
 * Executes a Slop Machine multi-step Pipeline programmatically and returns the full typed result payload.
 *
 * @param options - Execution parameters including the pipelineId and runtime prompt/variables/metadata/overrides.
 * @param init - Optional `AbortSignal` to cancel the request.
 * @returns A promise resolving to the completed PipelineResult document with `steps` mapped by `stepId` and `outputKey`.
 */
export async function executePipeline(
  options: ExecutePipelineOptions,
  init?: { signal?: AbortSignal },
): Promise<PipelineResult> {
  const {
    pipelineId,
    siloId,
    prompt,
    resultId,
    version,
    aspectRatio,
    duration,
    attachments,
    variables,
    metadata,
    baseUrl,
    signal,
  } = options;

  const hasAspectRatio =
    typeof aspectRatio === "string"
      ? aspectRatio.length > 0
      : Boolean(aspectRatio && Object.keys(aspectRatio).length > 0);
  const hasDuration =
    typeof duration === "number"
      ? duration > 0
      : Boolean(duration && Object.keys(duration).length > 0);
  const hasAttachments = Array.isArray(attachments)
    ? attachments.length > 0
    : Boolean(attachments && Object.keys(attachments).length > 0);

  const effectiveSignal = init?.signal ?? signal;
  let response: Response;
  try {
    response = await fetch(endpoint("renderPipeline", baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      ...(effectiveSignal ? { signal: effectiveSignal } : {}),
      body: JSON.stringify({
        pipelineId,
        ...(siloId ? { siloId } : {}),
        ...(prompt ? { prompt } : {}),
        ...(resultId ? { resultId } : {}),
        ...(version ? { version } : {}),
        ...(hasAspectRatio ? { aspectRatio } : {}),
        ...(hasDuration ? { duration } : {}),
        ...(hasAttachments ? { attachments } : {}),
        variables,
        metadata,
        sync: true,
      }),
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new SlopMachineError(
      err instanceof Error ? err.message : "Pipeline execution failed",
    );
  }

  if (!response.ok) {
    const errorDetail = await readErrorMessage(response, response.statusText);
    throw new SlopMachineError(
      `Pipeline execution failed (${response.status}): ${errorDetail}`,
      response.status,
    );
  }

  const rawResult = (await response.json()) as PipelineResult;
  return {
    ...rawResult,
    steps: mapStepResults(rawResult),
  };
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
  const response = await fetch(endpoint("uploadTempAttachment"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { base64, mimeType } }),
  });
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

const DEFAULT_API_BASE_URL = "https://slopmachine.dev";

export interface RateResultOptions {
  /**
   * API key (`x-api-key`) used to authenticate the rating request.
   * Must only be used on the server — never expose your API key in browser code.
   */
  apiKey: string;
  /**
   * Base URL of the Slop Machine web API (defaults to `https://slopmachine.dev`).
   */
  apiBaseUrl?: string;
}

export interface RateResultResponse {
  success: boolean;
  resultId: string;
  rating: ResultRating;
}

/**
 * Rates a previously generated result as "good", "bad", or clears its rating (null).
 *
 * **Server-side use only:** This function requires a Slop Machine API key (`apiKey`),
 * which grants write access to your silos and must never be used in browser code.
 *
 * @param resultId - The unique ID of the result to rate.
 * @param rating - The rating to apply ("good", "bad", or null to clear).
 * @param options - Configuration options including the required `apiKey` and optional `apiBaseUrl`.
 * @returns A promise resolving to the rating update response.
 */
export async function rateResult(
  resultId: string,
  rating: ResultRating,
  options: RateResultOptions,
): Promise<RateResultResponse> {
  if (!resultId) {
    throw new Error("resultId is required");
  }
  const apiKey = options?.apiKey?.trim();
  if (!apiKey) {
    throw new Error("apiKey is required to rate a result");
  }

  const baseUrl = (options.apiBaseUrl || DEFAULT_API_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const url = `${baseUrl}/api/results/${encodeURIComponent(resultId)}/rating`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
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
    throw new Error(
      `Failed to rate result (${response.status}): ${errorDetail}`,
    );
  }

  return (await response.json()) as RateResultResponse;
}
