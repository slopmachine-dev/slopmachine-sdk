import {
  executePipeline,
  mapStepResults,
  SlopMachineError,
  type ExecutePipelineOptions,
  type PipelineResult,
  type PipelineStepResult,
} from "@slopmachine/core";
import { untrack } from "svelte";

export interface CreateSlopPipelineOptions extends Omit<
  ExecutePipelineOptions,
  "signal" | "baseUrl"
> {
  /**
   * When `false`, suppresses automatic execution on initialization and reactive updates.
   * Execution can still be triggered manually via `refetch()`. Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * Called when the pipeline execution completes successfully.
   */
  onSuccess?: (result: PipelineResult) => void;
  /**
   * Called when the pipeline execution fails.
   */
  onGenerationError?: (error: SlopMachineError) => void;
}

export interface SlopPipelineState {
  /**
   * The completed pipeline execution result, or `null` before completion.
   */
  readonly data: PipelineResult | null;
  /**
   * Dictionary of step results keyed by `stepId` and `outputKey` (when present),
   * e.g. `steps.heroVideo?.outputUrl` or `steps.brief?.outputData`.
   */
  readonly steps: Record<string, PipelineStepResult>;
  /**
   * `true` while a pipeline execution request is in flight.
   */
  readonly isLoading: boolean;
  /**
   * Error raised if the pipeline execution failed, or `null`.
   */
  readonly error: SlopMachineError | null;
  /**
   * Re-executes the pipeline and returns a promise resolving to the result.
   * Pass `overrideOptions` to change options for this run only (they are merged
   * over the current options; `enabled` is ignored). Runs even when `enabled` is `false`.
   */
  readonly refetch: (
    overrideOptions?: Partial<CreateSlopPipelineOptions>,
  ) => Promise<PipelineResult | null>;
}

export interface SlopPipelineStore extends SlopPipelineState {
  /**
   * Svelte store `subscribe` method, allowing both direct Svelte 5 rune property
   * access (`pipeline.data`, `pipeline.steps`, `pipeline.isLoading`, `pipeline.error`)
   * and `$pipeline` store auto-subscription syntax.
   */
  subscribe: (run: (value: SlopPipelineState) => void) => () => void;
}

const EMPTY_STEPS: Record<string, PipelineStepResult> = {};

function serializeOptionsKey(opts: CreateSlopPipelineOptions): string {
  return JSON.stringify({
    pipelineId: opts.pipelineId,
    siloId: opts.siloId,
    prompt: opts.prompt,
    resultId: opts.resultId,
    version: opts.version,
    aspectRatio: opts.aspectRatio,
    duration: opts.duration,
    attachments: opts.attachments,
    variables: opts.variables,
    metadata: opts.metadata,
    enabled: opts.enabled ?? true,
  });
}

/**
 * Svelte 5 rune and store helper for executing a multi-step Slop Machine pipeline
 * and consuming its outputs across multiple steps.
 *
 * Accepts either a plain `CreateSlopPipelineOptions` object or a reactive getter
 * function `() => CreateSlopPipelineOptions` that re-executes when reactive
 * dependencies change.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createSlopPipeline } from "@slopmachine/svelte";
 *
 *   let brand = $state("SlopKicks");
 *
 *   const pipeline = createSlopPipeline(() => ({
 *     pipelineId: "pipe_live_abc123",
 *     prompt: "Launch our summer sneaker drop",
 *     version: 3,
 *     aspectRatio: { heroVideo: "16:9" },
 *     variables: { brand },
 *   }));
 * </script>
 *
 * {#if pipeline.isLoading}
 *   <p>Generating...</p>
 * {:else if pipeline.error}
 *   <p>{pipeline.error.message}</p>
 * {:else if pipeline.data}
 *   <h1>{pipeline.steps.brief?.outputData?.headline}</h1>
 *   <video src={pipeline.steps.heroVideo?.outputUrl} poster={pipeline.steps.poster?.outputUrl} controls></video>
 * {/if}
 * ```
 */
export function createSlopPipeline(
  optionsOrGetter:
    | CreateSlopPipelineOptions
    | (() => CreateSlopPipelineOptions),
): SlopPipelineStore {
  const resolveOptions = (): CreateSlopPipelineOptions =>
    typeof optionsOrGetter === "function" ? optionsOrGetter() : optionsOrGetter;

  const initialOpts = resolveOptions();
  const initialCanRun =
    Boolean(initialOpts.pipelineId) && (initialOpts.enabled ?? true);

  let data = $state<PipelineResult | null>(null);
  let steps = $state<Record<string, PipelineStepResult>>(EMPTY_STEPS);
  let isLoading = $state<boolean>(initialCanRun);
  let error = $state<SlopMachineError | null>(null);

  let activeController: AbortController | null = null;
  const subscribers = new Set<(value: SlopPipelineState) => void>();

  function getSnapshot(): SlopPipelineState {
    return {
      data,
      steps,
      isLoading,
      error,
      refetch,
    };
  }

  function notify() {
    if (subscribers.size === 0) return;
    const snap = getSnapshot();
    for (const sub of subscribers) {
      sub(snap);
    }
  }

  async function executeWithOptions(
    opts: CreateSlopPipelineOptions,
  ): Promise<PipelineResult | null> {
    if (!opts.pipelineId) {
      isLoading = false;
      notify();
      return null;
    }

    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    isLoading = true;
    error = null;
    notify();

    try {
      const result = await executePipeline(
        {
          pipelineId: opts.pipelineId,
          siloId: opts.siloId,
          prompt: opts.prompt,
          resultId: opts.resultId,
          version: opts.version,
          aspectRatio: opts.aspectRatio,
          duration: opts.duration,
          attachments: opts.attachments,
          variables: opts.variables,
          metadata: opts.metadata,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return null;
      const mappedSteps = result.steps ?? mapStepResults(result);
      const enrichedResult: PipelineResult = {
        ...result,
        steps: mappedSteps,
      };
      data = enrichedResult;
      steps = mappedSteps;
      isLoading = false;
      notify();
      opts.onSuccess?.(enrichedResult);
      return enrichedResult;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const finalError =
        err instanceof SlopMachineError
          ? err
          : new SlopMachineError(
              err instanceof Error ? err.message : "Pipeline execution failed",
            );
      console.error(
        "createSlopPipeline error:",
        finalError.status ?? "",
        finalError.message,
      );
      error = finalError;
      isLoading = false;
      notify();
      opts.onGenerationError?.(finalError);
      return null;
    }
  }

  async function refetch(
    overrideOptions?: Partial<CreateSlopPipelineOptions>,
  ): Promise<PipelineResult | null> {
    const merged: CreateSlopPipelineOptions = {
      ...resolveOptions(),
      ...overrideOptions,
    };
    return executeWithOptions(merged);
  }

  let lastKey: string | null = null;
  let effectRan = false;

  try {
    $effect(() => {
      effectRan = true;
      const currentOpts = resolveOptions();
      const key = serializeOptionsKey(currentOpts);
      const canRun =
        Boolean(currentOpts.pipelineId) && (currentOpts.enabled ?? true);

      untrack(() => {
        if (!canRun) {
          activeController?.abort();
          activeController = null;
          isLoading = false;
          lastKey = key;
          notify();
          return;
        }

        if (key !== lastKey) {
          lastKey = key;
          void executeWithOptions(currentOpts);
        }
      });
    });

    $effect(() => {
      return () => {
        activeController?.abort();
        activeController = null;
      };
    });
  } catch {
    // Called outside a Svelte component initialization effect root (e.g. unit tests or plain TS)
  }

  // Effects are scheduled, not run synchronously, so start the first run now
  // rather than after mount. Never on the server: `$effect` is a no-op there, so
  // this would POST once during SSR and again on hydration. `isLoading` stays at
  // its initial value there, matching the first client render.
  if (!effectRan && initialCanRun && typeof window !== "undefined") {
    lastKey = serializeOptionsKey(initialOpts);
    void executeWithOptions(initialOpts);
  }

  return {
    get data() {
      return data;
    },
    get steps() {
      return steps;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    refetch,
    subscribe(run: (value: SlopPipelineState) => void) {
      subscribers.add(run);
      run(getSnapshot());
      return () => {
        subscribers.delete(run);
      };
    },
  };
}
