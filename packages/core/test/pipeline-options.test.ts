import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

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
  it("warns once per ignored bucket-only option (model, original) and forwards supported pipeline options", async () => {
    const core = await loadCore();
    const url = core.buildImageUrl({
      pipelineId: "p",
      model: "m",
      version: 2,
      original: true,
      attachments: ["a"],
    });
    expect(url).toBe(
      `${PROD}/renderPipeline?pipelineId=p&redirect=true&version=2&attachments=%5B%22a%22%5D`,
    );
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      '[slopmachine] "model" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
      '[slopmachine] "original" is only supported for buckets (bucketId) and is ignored when pipelineId is set.',
    ]);

    // Components rebuild URLs on every render: don't repeat the warnings
    core.buildImageUrl({ pipelineId: "p", model: "m", original: true });
    core.buildTextUrl({ pipelineId: "p", model: "m" });
    core.buildVideoUrl({ pipelineId: "p", original: true });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("does not warn for version, duration, attachments, or aspectRatio on pipelines", async () => {
    const core = await loadCore();
    const videoUrl = core.buildVideoUrl({
      pipelineId: "p",
      version: 3,
      aspectRatio: "9:16",
      duration: 6,
      attachments: ["https://a.dev/ref.png"],
    });
    const textUrl = core.buildTextUrl({
      pipelineId: "p",
      version: 4,
      aspectRatio: { step_1: "16:9" },
      duration: { step_1: 5 },
      attachments: { step_1: ["https://a.dev/doc.png"] },
    });
    expect(videoUrl).toBe(
      `${PROD}/renderPipeline?pipelineId=p&redirect=true&version=3&aspectRatio=9%3A16&duration=6&attachments=%5B%22https%3A%2F%2Fa.dev%2Fref.png%22%5D`,
    );
    expect(textUrl).toBe(
      `${PROD}/renderPipeline?pipelineId=p&sync=true&version=4&aspectRatio=%7B%22step_1%22%3A%2216%3A9%22%7D&duration=%7B%22step_1%22%3A5%7D&attachments=%7B%22step_1%22%3A%5B%22https%3A%2F%2Fa.dev%2Fdoc.png%22%5D%7D`,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for empty values", async () => {
    const core = await loadCore();
    core.buildImageUrl({
      pipelineId: "p",
      aspectRatio: "16:9",
      original: false,
      attachments: [],
      variables: {},
    });
    core.buildVideoUrl({ pipelineId: "p", aspectRatio: "9:16", original: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for bucket requests", async () => {
    const core = await loadCore();
    core.buildImageUrl({
      bucketId: "b",
      model: "m",
      version: 2,
      attachments: ["a"],
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
