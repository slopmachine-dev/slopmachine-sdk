// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SlopImage,
  SlopText,
  SlopVideo,
  useSlopPipeline,
  type UseSlopPipelineOptions,
  type UseSlopPipelineResult,
} from "../src/index";

// Enable React act() environment in jsdom
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

type Handler = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;
let container: HTMLDivElement;
let root: Root;

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

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useSlopPipeline", () => {
  it("executes the pipeline, exposes steps keyed by stepId and outputKey, and supports refetch", async () => {
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
            outputData: {
              headline: `Drop #${callCount}`,
              seoDescription: "Limited edition",
            },
          },
          {
            stepId: "step_video",
            outputKey: "heroVideo",
            type: "video_generation",
            outputUrl: "https://cdn/hero.mp4",
          },
          {
            stepId: "step_thumb",
            outputKey: "poster",
            type: "thumbnail_generation",
            outputUrl: "https://cdn/poster.webp",
          },
        ],
        totalComputeTimeMs: 900,
        totalFuelCost: 12,
        timestamp: 1000,
      });
    });

    let latestState: UseSlopPipelineResult | null = null;

    function TestView(props: UseSlopPipelineOptions) {
      const state = useSlopPipeline(props);
      latestState = state;
      return (
        <div>
          <span data-testid="loading">{String(state.isLoading)}</span>
          <span data-testid="headline">
            {state.steps.brief?.outputData?.headline ?? ""}
          </span>
          <span data-testid="video-url">
            {state.steps.heroVideo?.outputUrl ?? ""}
          </span>
          <span data-testid="poster-url">
            {state.steps.poster?.outputUrl ?? ""}
          </span>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <TestView
          pipelineId="pipe_1"
          siloId="silo_1"
          prompt="launch reel"
          version={3}
          aspectRatio={{ step_video: "16:9" }}
          duration={{ step_video: 6 }}
          attachments={{ step_video: ["https://cdn/ref.png"] }}
          variables={{ brand: "SlopKicks" }}
          metadata={{ userId: "u1" }}
        />,
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      pipelineId: "pipe_1",
      siloId: "silo_1",
      prompt: "launch reel",
      version: 3,
      aspectRatio: { step_video: "16:9" },
      duration: { step_video: 6 },
      attachments: { step_video: ["https://cdn/ref.png"] },
      variables: { brand: "SlopKicks" },
      metadata: { userId: "u1" },
      sync: true,
    });

    expect(latestState?.isLoading).toBe(false);
    expect(latestState?.error).toBeNull();
    expect(latestState?.data?.id).toBe("res_1");
    expect(latestState?.steps.brief?.outputData?.headline).toBe("Drop #1");
    expect(latestState?.steps.step_json?.outputData?.headline).toBe("Drop #1");
    expect(latestState?.steps.heroVideo?.outputUrl).toBe(
      "https://cdn/hero.mp4",
    );
    expect(latestState?.steps.poster?.outputUrl).toBe(
      "https://cdn/poster.webp",
    );

    await act(async () => {
      await latestState?.refetch();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(latestState?.data?.id).toBe("res_2");
    expect(latestState?.steps.brief?.outputData?.headline).toBe("Drop #2");
  });

  it("surfaces SlopMachineError and invokes onGenerationError on failure", async () => {
    mockFetch(async () => json({ error: "Missing variable 'brand'" }, 400));
    const onError = vi.fn();
    let latestState: UseSlopPipelineResult | null = null;

    function TestErrorView() {
      latestState = useSlopPipeline({
        pipelineId: "pipe_err",
        onGenerationError: onError,
      });
      return null;
    }

    await act(async () => {
      root.render(<TestErrorView />);
    });

    expect(latestState?.isLoading).toBe(false);
    expect(latestState?.error?.status).toBe(400);
    expect(latestState?.error?.message).toContain("Missing variable 'brand'");
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
        totalComputeTimeMs: 100,
        totalFuelCost: 1,
        timestamp: 1,
      }),
    );

    let latestState: UseSlopPipelineResult | null = null;

    function TestManualView() {
      latestState = useSlopPipeline({
        pipelineId: "pipe_manual",
        enabled: false,
      });
      return null;
    }

    await act(async () => {
      root.render(<TestManualView />);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(latestState?.isLoading).toBe(false);
    expect(latestState?.data).toBeNull();

    await act(async () => {
      await latestState?.refetch();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(latestState?.data?.id).toBe("res_manual");
  });
});

describe("React components in pipelineId mode", () => {
  it("forwards version, aspectRatio, duration and attachments in SlopImage, SlopVideo and SlopText", async () => {
    mockFetch(async (url, init) => {
      if (init?.method === "HEAD") return new Response(null, { status: 200 });
      if (url.includes("sync=true")) return new Response("Hello", { status: 200 });
      return new Response(null, { status: 200 });
    });

    await act(async () => {
      root.render(
        <div>
          <SlopImage
            pipelineId="p_img"
            version={3}
            aspectRatio={{ step_img: "16:9" }}
            duration={{ step_vid: 4 }}
            attachments={{ step_img: ["https://cdn/a.png"] }}
          />
          <SlopVideo
            pipelineId="p_vid"
            version={2}
            aspectRatio="9:16"
            duration={6}
            attachments={["https://cdn/b.png"]}
          />
          <SlopText
            pipelineId="p_txt"
            version={5}
            aspectRatio="1:1"
            duration={4}
            attachments={["https://cdn/c.png"]}
          />
        </div>,
      );
    });

    const img = container.querySelector("img");
    const video = container.querySelector("video");
    expect(img?.getAttribute("src")).toContain("pipelineId=p_img");
    expect(img?.getAttribute("src")).toContain("version=3");
    expect(img?.getAttribute("src")).toContain(
      "aspectRatio=%7B%22step_img%22%3A%2216%3A9%22%7D",
    );
    expect(img?.getAttribute("src")).toContain(
      "duration=%7B%22step_vid%22%3A4%7D",
    );
    expect(img?.getAttribute("src")).toContain(
      "attachments=%7B%22step_img%22%3A%5B%22https%3A%2F%2Fcdn%2Fa.png%22%5D%7D",
    );

    expect(video?.getAttribute("src")).toContain("pipelineId=p_vid");
    expect(video?.getAttribute("src")).toContain("version=2");
    expect(video?.getAttribute("src")).toContain("aspectRatio=9%3A16");
    expect(video?.getAttribute("src")).toContain("duration=6");
    expect(video?.getAttribute("src")).toContain(
      "attachments=%5B%22https%3A%2F%2Fcdn%2Fb.png%22%5D",
    );

    const textFetchCall = fetchMock.mock.calls.find(([u]) =>
      u.includes("pipelineId=p_txt"),
    );
    expect(textFetchCall?.[0]).toContain("version=5");
    expect(textFetchCall?.[0]).toContain("aspectRatio=1%3A1");
    expect(textFetchCall?.[0]).toContain("duration=4");
    expect(textFetchCall?.[0]).toContain(
      "attachments=%5B%22https%3A%2F%2Fcdn%2Fc.png%22%5D",
    );
  });
});
