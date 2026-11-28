// @vitest-environment node
// In the node environment Vitest transforms modules for SSR, so
// vite-plugin-svelte compiles `createSlopPipeline.svelte.ts` with
// `generate: "server"` (where `$effect` is a no-op) and there is no `window`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSlopPipeline } from "../src/index";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createSlopPipeline during SSR", () => {
  it("does not execute the pipeline on the server and stays in its initial loading state", async () => {
    expect(typeof window).toBe("undefined");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const pipeline = createSlopPipeline({ pipelineId: "pipe_ssr" });
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).not.toHaveBeenCalled();
    // Matches the first client render, which starts loading on hydration
    expect(pipeline.isLoading).toBe(true);
    expect(pipeline.data).toBeNull();
    expect(pipeline.error).toBeNull();
  });

  it("is not loading on the server when it can't run", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const pipeline = createSlopPipeline({ pipelineId: "p", enabled: false });
    expect(pipeline.isLoading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
