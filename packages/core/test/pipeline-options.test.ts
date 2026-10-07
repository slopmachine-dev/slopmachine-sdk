import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const PROD = "https://us-central1-slopmachine-12bfb.cloudfunctions.net";

// The warn-once set is module-level state, so each test gets a fresh copy of the module
async function loadCore() {
  vi.resetModules();
  return import("../src/index");
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("bucket-only options with pipelineId", () => {
  it("warns once per ignored option and leaves the URL unchanged", async () => {
    const core = await loadCore();
    const url = core.buildImageUrl({
      pipelineId: "p",
      model: "m",
      version: 2,
      original: true,
      attachments: ["a"],
    });
    expect(url).toBe(`${PROD}/renderPipeline?pipelineId=p&redirect=true`);
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      '[slopmachine] "model" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
      '[slopmachine] "version" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
      '[slopmachine] "original" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
      '[slopmachine] "attachments" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
    ]);

    // Components rebuild URLs on every render: don't repeat the warnings
    core.buildImageUrl({ pipelineId: "p", model: "m" });
    core.buildTextUrl({ pipelineId: "p", model: "m" });
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it("warns for video duration and text model", async () => {
    const core = await loadCore();
    core.buildVideoUrl({ pipelineId: "p", duration: 6 });
    core.buildTextUrl({ pipelineId: "p", model: "m" });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('"duration"');
    expect(warn.mock.calls[1][0]).toContain('"model"');
  });

  it("does not warn for aspectRatio (it sizes the component) or empty values", async () => {
    const core = await loadCore();
    core.buildImageUrl({
      pipelineId: "p",
      aspectRatio: "16:9",
      original: false,
      attachments: [],
      variables: {},
    });
    core.buildVideoUrl({ pipelineId: "p", aspectRatio: "9:16" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for bucket requests", async () => {
    const core = await loadCore();
    core.buildImageUrl({ bucketId: "b", model: "m", version: 2, attachments: ["a"] });
    expect(warn).not.toHaveBeenCalled();
  });
});
