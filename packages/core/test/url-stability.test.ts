import { describe, expect, it } from "vitest";
import {
  buildImageUrl,
  buildPipelineUrl,
  buildTextUrl,
  buildVideoUrl,
} from "../src/index";

// Browsers and CDNs cache by the exact URL string, so the parameter order and
// encoding of generated URLs must not change. These are exact-string snapshots.
const API = "https://us-central1-slopmachine-12bfb.cloudfunctions.net";
const full = {
  variables: { theme: "dark", n: 2 },
  metadata: { userId: "u1" },
  attachments: ["https://a.dev/x.png"],
};

describe("generated URLs are byte-for-byte stable", () => {
  it("buildImageUrl (bucket)", () => {
    expect(
      buildImageUrl({
        bucketId: "b1",
        aspectRatio: "16:9",
        model: "gemini-flash",
        version: 2,
        original: true,
        ...full,
      }),
    ).toBe(
      `${API}/renderImage?bucketId=b1&aspectRatio=16%3A9&model=gemini-flash&version=2&original=true&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D`,
    );
  });

  it("buildImageUrl (result)", () => {
    expect(buildImageUrl({ bucketId: "b1", resultId: "r1", model: "m" })).toBe(
      `${API}/renderImage?bucketId=b1&resultId=r1`,
    );
  });

  it("buildImageUrl (pipeline)", () => {
    expect(
      buildImageUrl({
        pipelineId: "p1",
        siloId: "s1",
        prompt: "a b",
        resultId: "r1",
        variables: full.variables,
        metadata: full.metadata,
      }),
    ).toBe(
      `${API}/renderPipeline?pipelineId=p1&redirect=true&siloId=s1&prompt=a+b&resultId=r1&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D`,
    );
  });

  it("buildVideoUrl (bucket)", () => {
    expect(
      buildVideoUrl({
        bucketId: "b1",
        aspectRatio: "9:16",
        version: 3,
        duration: 6,
        original: true,
        ...full,
      }),
    ).toBe(
      `${API}/renderVideo?bucketId=b1&aspectRatio=9%3A16&version=3&duration=6&original=true&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D`,
    );
  });

  it("buildVideoUrl (pipeline)", () => {
    expect(buildVideoUrl({ pipelineId: "p1", prompt: "go" })).toBe(
      `${API}/renderPipeline?pipelineId=p1&redirect=true&prompt=go`,
    );
  });

  it("buildTextUrl (bucket)", () => {
    expect(
      buildTextUrl({ bucketId: "b1", model: "gemini-pro", version: 1, ...full }),
    ).toBe(
      `${API}/renderText?bucketId=b1&model=gemini-pro&version=1&variables=%7B%22theme%22%3A%22dark%22%2C%22n%22%3A2%7D&metadata=%7B%22userId%22%3A%22u1%22%7D&attachments=%5B%22https%3A%2F%2Fa.dev%2Fx.png%22%5D`,
    );
  });

  it("buildTextUrl (pipeline)", () => {
    expect(
      buildTextUrl({ pipelineId: "p1", siloId: "s1", prompt: "go", resultId: "r1" }),
    ).toBe(`${API}/renderPipeline?pipelineId=p1&sync=true&siloId=s1&prompt=go&resultId=r1`);
  });

  it("buildPipelineUrl", () => {
    expect(
      buildPipelineUrl({
        pipelineId: "p1",
        siloId: "s1",
        prompt: "go",
        resultId: "r1",
        redirect: true,
        variables: { a: 1 },
        metadata: { b: 2 },
      }),
    ).toBe(
      `${API}/renderPipeline?pipelineId=p1&siloId=s1&prompt=go&resultId=r1&sync=true&redirect=true&variables=%7B%22a%22%3A1%7D&metadata=%7B%22b%22%3A2%7D`,
    );
  });
});
