import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSlopPipeline, type SlopPipelineState } from "../src/index";

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

  it("re-executes reactively when a getter function's dependencies change", async () => {
    const calls: Array<Record<string, unknown>> = [];
    mockFetch(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      calls.push(body);
      return json({
        id: `res_${calls.length}`,
        pipelineId: body.pipelineId,
        siloId: "s1",
        status: "completed",
        resultType: "image",
        stepResults: [
          {
            stepId: "s_img",
            outputKey: "poster",
            type: "image_generation",
            outputUrl: `https://cdn/${calls.length}.webp`,
          },
        ],
        totalComputeTimeMs: 100,
        totalFuelCost: 1,
        timestamp: 1,
      });
    });

    let currentVersion = 1;
    const pipeline = createSlopPipeline(() => ({
      pipelineId: "pipe_reactive",
      version: currentVersion,
    }));

    await flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].version).toBe(1);
    expect(pipeline.steps.poster?.outputUrl).toBe("https://cdn/1.webp");

    currentVersion = 2;
    await pipeline.refetch();
    expect(calls).toHaveLength(2);
    expect(calls[1].version).toBe(2);
    expect(pipeline.steps.poster?.outputUrl).toBe("https://cdn/2.webp");
  });
});
