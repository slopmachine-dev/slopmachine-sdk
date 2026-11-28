import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import {
  createSlopPipeline,
  type SlopPipelineState,
  type SlopPipelineStore,
} from "../src/index";

type Handler = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function mockFetch(handler: Handler) {
  fetchMock = vi.fn<Handler>(handler);
  vi.stubGlobal("fetch", fetchMock);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createSlopPipeline", () => {
  it("executes the pipeline, maps steps by stepId and outputKey, and notifies subscribers", async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount += 1;
      return json({
        id: `res_${callCount}`,
        pipelineId: "pipe_1",
        siloId: "silo_1",
        status: "completed",
        resultType: "video",
        url: "https://cdn/hero.mp4",
        stepResults: [
          {
            stepId: "step_json",
            outputKey: "brief",
            type: "json_generation",
            outputData: { headline: `Headline #${callCount}` },
          },
          {
            stepId: "step_video",
            outputKey: "heroVideo",
            type: "video_generation",
            outputUrl: "https://cdn/hero.mp4",
          },
        ],
        totalComputeTimeMs: 500,
        totalFuelCost: 8,
        timestamp: 1,
      });
    });

    const snapshots: SlopPipelineState[] = [];
    const pipeline = createSlopPipeline({
      pipelineId: "pipe_1",
      siloId: "silo_1",
      prompt: "summer reel",
      version: 2,
      aspectRatio: { step_video: "9:16" },
      duration: { step_video: 5 },
      attachments: { step_video: ["https://cdn/frame.png"] },
      variables: { theme: "neon" },
      metadata: { campaign: "summer" },
    });

    const unsubscribe = pipeline.subscribe((state) => {
      snapshots.push(state);
    });

    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      pipelineId: "pipe_1",
      siloId: "silo_1",
      prompt: "summer reel",
      version: 2,
      aspectRatio: { step_video: "9:16" },
      duration: { step_video: 5 },
      attachments: { step_video: ["https://cdn/frame.png"] },
      variables: { theme: "neon" },
      metadata: { campaign: "summer" },
      sync: true,
    });

    expect(pipeline.isLoading).toBe(false);
    expect(pipeline.error).toBeNull();
    expect(pipeline.data?.id).toBe("res_1");
    expect(pipeline.steps.brief?.outputData?.headline).toBe("Headline #1");
    expect(pipeline.steps.step_json?.outputData?.headline).toBe("Headline #1");
    expect(pipeline.steps.heroVideo?.outputUrl).toBe("https://cdn/hero.mp4");
    expect(snapshots[snapshots.length - 1]?.data?.id).toBe("res_1");

    await pipeline.refetch();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pipeline.data?.id).toBe("res_2");
    expect(pipeline.steps.brief?.outputData?.headline).toBe("Headline #2");

    unsubscribe();
  });

  it("reports SlopMachineError and invokes onGenerationError on failure", async () => {
    mockFetch(async () => json({ error: "Pipeline not found" }, 404));
    const onError = vi.fn();

    const pipeline = createSlopPipeline({
      pipelineId: "missing_pipe",
      onGenerationError: onError,
    });

    await flush();

    expect(pipeline.isLoading).toBe(false);
    expect(pipeline.error?.status).toBe(404);
    expect(pipeline.error?.message).toContain("Pipeline not found");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("respects enabled: false until refetch() is called", async () => {
    mockFetch(async () =>
      json({
        id: "res_manual",
        pipelineId: "pipe_manual",
        siloId: "s1",
        status: "completed",
        resultType: "text",
        stepResults: [],
        totalComputeTimeMs: 50,
        totalFuelCost: 1,
        timestamp: 1,
      }),
    );

    const pipeline = createSlopPipeline({
      pipelineId: "pipe_manual",
      enabled: false,
    });

    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pipeline.isLoading).toBe(false);
    expect(pipeline.data).toBeNull();

    await pipeline.refetch();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pipeline.data?.id).toBe("res_manual");
  });

  it("re-executes reactively when a getter's $state dependencies change, and aborts on cleanup", async () => {
    const calls: Array<{ body: Record<string, unknown>; signal: AbortSignal }> =
      [];
    // Only the first two requests resolve; the third stays in flight until aborted
    mockFetch((_url, init) => {
      const body = JSON.parse(init?.body as string);
      const signal = init?.signal as AbortSignal;
      calls.push({ body, signal });
      const n = calls.length;
      if (n === 3) {
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }
      return Promise.resolve(
        json({
          id: `res_${n}`,
          pipelineId: body.pipelineId,
          siloId: "s1",
          status: "completed",
          resultType: "image",
          stepResults: [
            {
              stepId: "s_img",
              outputKey: "poster",
              type: "image_generation",
              outputUrl: `https://cdn/${n}.webp`,
            },
          ],
          totalComputeTimeMs: 100,
          totalFuelCost: 1,
          timestamp: 1,
        }),
      );
    });

    const options = $state({ version: 1, enabled: true });
    let pipeline!: SlopPipelineStore;

    const cleanup = $effect.root(() => {
      pipeline = createSlopPipeline(() => ({
        pipelineId: "pipe_reactive",
        version: options.version,
        enabled: options.enabled,
      }));
    });

    flushSync();
    await flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].body.version).toBe(1);
    expect(pipeline.steps.poster?.outputUrl).toBe("https://cdn/1.webp");

    // A $state change re-runs the effect without any manual refetch()
    options.version = 2;
    flushSync();
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[1].body.version).toBe(2);
    expect(pipeline.steps.poster?.outputUrl).toBe("https://cdn/2.webp");

    // Re-running with unchanged options doesn't re-execute
    options.enabled = true;
    flushSync();
    await flush();
    expect(calls).toHaveLength(2);

    options.version = 3;
    flushSync();
    expect(calls).toHaveLength(3);
    expect(pipeline.isLoading).toBe(true);
    expect(calls[2].signal.aborted).toBe(false);

    // Tearing down the effect root (e.g. component unmount) aborts the in-flight run
    cleanup();
    expect(calls[2].signal.aborted).toBe(true);
    await flush();
    expect(pipeline.error).toBeNull();
    expect(pipeline.steps.poster?.outputUrl).toBe("https://cdn/2.webp");
  });

  it("aborts the previous run when options change mid-flight", async () => {
    const signals: AbortSignal[] = [];
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          signals.push(signal);
          signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const options = $state({ prompt: "a" });
    const cleanup = $effect.root(() => {
      createSlopPipeline(() => ({ pipelineId: "p", prompt: options.prompt }));
    });
    flushSync();
    expect(signals).toHaveLength(1);

    options.prompt = "b";
    flushSync();
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    cleanup();
    expect(signals[1].aborted).toBe(true);
  });
});
