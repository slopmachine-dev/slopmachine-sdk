import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  executePipeline,
  mapStepResults,
  SlopMachineError,
  type ExecutePipelineOptions,
  type PipelineResult,
  type PipelineStepResult,
} from "@slopmachine/core";

export interface UseSlopPipelineOptions extends Omit<
  ExecutePipelineOptions,
  "signal"
> {
  /**
   * When `false`, suppresses automatic execution on mount and dependency changes.
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

export interface UseSlopPipelineResult {
  /**
   * The completed pipeline execution result, or `null` before completion.
   */
  data: PipelineResult | null;
  /**
   * Dictionary of step results keyed by `stepId` and `outputKey` (when present),
   * e.g. `steps.heroVideo?.outputUrl` or `steps.brief?.outputData`.
   */
  steps: Record<string, PipelineStepResult>;
  /**
   * `true` while a pipeline execution request is in flight.
   */
  isLoading: boolean;
  /**
   * Error raised if the pipeline execution failed, or `null`.
   */
  error: SlopMachineError | null;
  /**
   * Re-executes the pipeline with the current options and returns the resolved result.
   */
  refetch: () => Promise<PipelineResult | null>;
}

const EMPTY_STEPS: Record<string, PipelineStepResult> = {};

/**
 * Declarative React hook for executing a multi-step Slop Machine pipeline and
 * consuming its outputs across multiple steps.
 *
 * @example
 * ```tsx
 * const { data, steps, isLoading, error, refetch } = useSlopPipeline({
 *   pipelineId: "pipe_live_abc123",
 *   prompt: "Launch our summer sneaker drop",
 *   version: 3,
 *   aspectRatio: { heroVideo: "16:9" },
 *   variables: { brand: "SlopKicks" },
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <p>{error.message}</p>;
 *
 * return (
 *   <article>
 *     <h1>{steps.brief?.outputData?.headline}</h1>
 *     <video src={steps.heroVideo?.outputUrl} poster={steps.poster?.outputUrl} controls />
 *   </article>
 * );
 * ```
 */
export function useSlopPipeline(
  options: UseSlopPipelineOptions,
): UseSlopPipelineResult {
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
    enabled = true,
    onSuccess,
    onGenerationError,
  } = options;

  const canRun = Boolean(pipelineId) && enabled;

  const [data, setData] = useState<PipelineResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(canRun);
  const [error, setError] = useState<SlopMachineError | null>(null);

  const onSuccessRef = useRef(onSuccess);
  const onGenerationErrorRef = useRef(onGenerationError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onGenerationErrorRef.current = onGenerationError;
  });

  const serializedAspectRatio = JSON.stringify(aspectRatio);
  const serializedDuration = JSON.stringify(duration);
  const serializedAttachments = JSON.stringify(attachments);
  const serializedVariables = JSON.stringify(variables);
  const serializedMetadata = JSON.stringify(metadata);

  const stableOptions = useMemo<ExecutePipelineOptions>(
    () => ({
      pipelineId,
      siloId,
      prompt,
      resultId,
      version,
      aspectRatio:
        serializedAspectRatio !== undefined
          ? JSON.parse(serializedAspectRatio)
          : undefined,
      duration:
        serializedDuration !== undefined
          ? JSON.parse(serializedDuration)
          : undefined,
      attachments:
        serializedAttachments !== undefined
          ? JSON.parse(serializedAttachments)
          : undefined,
      variables:
        serializedVariables !== undefined
          ? JSON.parse(serializedVariables)
          : undefined,
      metadata:
        serializedMetadata !== undefined
          ? JSON.parse(serializedMetadata)
          : undefined,
      baseUrl,
    }),
    [
      pipelineId,
      siloId,
      prompt,
      resultId,
      version,
      serializedAspectRatio,
      serializedDuration,
      serializedAttachments,
      serializedVariables,
      serializedMetadata,
      baseUrl,
    ],
  );

  const activeControllerRef = useRef<AbortController | null>(null);

  const runExecution = useCallback(async (): Promise<PipelineResult | null> => {
    if (!stableOptions.pipelineId) {
      setIsLoading(false);
      return null;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await executePipeline(stableOptions, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return null;
      const enrichedResult: PipelineResult = {
        ...result,
        steps: result.steps ?? mapStepResults(result),
      };
      setData(enrichedResult);
      setIsLoading(false);
      onSuccessRef.current?.(enrichedResult);
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
        "useSlopPipeline error:",
        finalError.status ?? "",
        finalError.message,
      );
      setError(finalError);
      setIsLoading(false);
      onGenerationErrorRef.current?.(finalError);
      return null;
    }
  }, [stableOptions]);

  useEffect(() => {
    if (!canRun) {
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
      setIsLoading(false);
      return;
    }

    void runExecution();

    return () => {
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, [canRun, runExecution]);

  const steps = useMemo(
    () => (data ? (data.steps ?? mapStepResults(data)) : EMPTY_STEPS),
    [data],
  );

  return {
    data,
    steps,
    isLoading,
    error,
    refetch: runExecution,
  };
}
