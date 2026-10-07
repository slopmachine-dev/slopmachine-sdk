import { describe, expect, it } from "vitest";
import {
  buildImageUrl,
  buildPipelineUrl,
  buildTextUrl,
  buildVideoUrl,
  interpolatePrompt,
} from "../src/index";

const API = "https://us-central1-slopmachine-12bfb.cloudfunctions.net";

function parse(url: string) {
  const parsed = new URL(url);
  return {
    endpoint: `${parsed.origin}${parsed.pathname}`,
    params: Object.fromEntries(parsed.searchParams),
  };
}

describe("buildImageUrl", () => {
  it("targets renderImage with a default 1:1 aspect ratio", () => {
    expect(parse(buildImageUrl({ bucketId: "b1" }))).toEqual({
      endpoint: `${API}/renderImage`,
      params: { bucketId: "b1", aspectRatio: "1:1" },
    });
  });

  it("serializes all bucket options", () => {
    const { params } = parse(
      buildImageUrl({
        bucketId: "b1",
        aspectRatio: "16:9",
        model: "gemini-flash",
        version: 2,
        original: true,
        variables: { theme: "dark", count: 3 },
        metadata: { userId: "u1" },
        attachments: ["https://a.dev/x.png"],
      }),
    );
    expect(params).toEqual({
      bucketId: "b1",
      aspectRatio: "16:9",
      model: "gemini-flash",
      version: "2",
      original: "true",
      variables: '{"theme":"dark","count":3}',
      metadata: '{"userId":"u1"}',
      attachments: '["https://a.dev/x.png"]',
    });
  });

  it("omits empty variables, metadata and attachments", () => {
    const { params } = parse(
      buildImageUrl({
        bucketId: "b1",
        variables: {},
        metadata: {},
        attachments: [],
      }),
    );
    expect(params).toEqual({ bucketId: "b1", aspectRatio: "1:1" });
  });

  it("only sends bucketId and resultId when retrieving a result", () => {
    const { params } = parse(
      buildImageUrl({
        bucketId: "b1",
        resultId: "r1",
        model: "gemini-flash",
        version: 2,
        variables: { theme: "dark" },
      }),
    );
    expect(params).toEqual({ bucketId: "b1", resultId: "r1" });
  });

  it("uses baseUrl as the full endpoint", () => {
    const { endpoint } = parse(
      buildImageUrl({ bucketId: "b1", baseUrl: "http://localhost:5001/img" }),
    );
    expect(endpoint).toBe("http://localhost:5001/img");
  });

  it("targets renderPipeline with a redirect when given a pipelineId", () => {
    expect(
      parse(
        buildImageUrl({
          pipelineId: "p1",
          siloId: "s1",
          prompt: "a robot",
          variables: { mood: "happy" },
          metadata: { userId: "u1" },
        }),
      ),
    ).toEqual({
      endpoint: `${API}/renderPipeline`,
      params: {
        pipelineId: "p1",
        redirect: "true",
        siloId: "s1",
        prompt: "a robot",
        variables: '{"mood":"happy"}',
        metadata: '{"userId":"u1"}',
      },
    });
  });
});

describe("buildVideoUrl", () => {
  it("targets renderVideo with a default 16:9 aspect ratio", () => {
    expect(parse(buildVideoUrl({ bucketId: "b1" }))).toEqual({
      endpoint: `${API}/renderVideo`,
      params: { bucketId: "b1", aspectRatio: "16:9" },
    });
  });

  it("includes duration", () => {
    expect(
      parse(buildVideoUrl({ bucketId: "b1", duration: 6 })).params,
    ).toEqual({ bucketId: "b1", aspectRatio: "16:9", duration: "6" });
  });

  it("only sends bucketId and resultId when retrieving a result", () => {
    const { params } = parse(
      buildVideoUrl({ bucketId: "b1", resultId: "r1", duration: 6 }),
    );
    expect(params).toEqual({ bucketId: "b1", resultId: "r1" });
  });
});

describe("buildTextUrl", () => {
  it("targets renderText without an aspect ratio", () => {
    expect(
      parse(buildTextUrl({ bucketId: "b1", model: "gemini-pro" })),
    ).toEqual({
      endpoint: `${API}/renderText`,
      params: { bucketId: "b1", model: "gemini-pro" },
    });
  });

  it("only sends bucketId and resultId when retrieving a result", () => {
    const { params } = parse(
      buildTextUrl({ bucketId: "b1", resultId: "r1", model: "gemini-pro" }),
    );
    expect(params).toEqual({ bucketId: "b1", resultId: "r1" });
  });

  it("requests a synchronous pipeline run instead of a redirect", () => {
    const { endpoint, params } = parse(
      buildTextUrl({ pipelineId: "p1", prompt: "a haiku" }),
    );
    expect(endpoint).toBe(`${API}/renderPipeline`);
    expect(params).toEqual({
      pipelineId: "p1",
      sync: "true",
      prompt: "a haiku",
    });
  });
});

describe("buildPipelineUrl", () => {
  it("defaults to a synchronous run without a redirect", () => {
    expect(parse(buildPipelineUrl({ pipelineId: "p1" }))).toEqual({
      endpoint: `${API}/renderPipeline`,
      params: { pipelineId: "p1", sync: "true" },
    });
  });

  it("serializes all options", () => {
    const { params } = parse(
      buildPipelineUrl({
        pipelineId: "p1",
        siloId: "s1",
        prompt: "go",
        resultId: "r1",
        sync: false,
        redirect: true,
        variables: { a: 1 },
        metadata: { b: 2 },
      }),
    );
    expect(params).toEqual({
      pipelineId: "p1",
      siloId: "s1",
      prompt: "go",
      resultId: "r1",
      sync: "false",
      redirect: "true",
      variables: '{"a":1}',
      metadata: '{"b":2}',
    });
  });
});

describe("interpolatePrompt", () => {
  it("replaces every occurrence of each variable", () => {
    expect(
      interpolatePrompt("A {color} dog and a {color} cat, {n} total", {
        color: "brown",
        n: 2,
      }),
    ).toBe("A brown dog and a brown cat, 2 total");
  });

  it("leaves placeholders for null or undefined values", () => {
    expect(
      interpolatePrompt("{a} {b} {c}", { a: null, b: undefined, c: "x" }),
    ).toBe("{a} {b} x");
  });

  it("treats keys literally, even with regex metacharacters", () => {
    expect(
      interpolatePrompt("{a.b} {axb} {c+}", { "a.b": "dot", "c+": "plus" }),
    ).toBe("dot {axb} plus");
  });

  it("inserts values literally, including $ patterns", () => {
    expect(interpolatePrompt("Price: {p}", { p: "$100 or $& or $1" })).toBe(
      "Price: $100 or $& or $1",
    );
  });

  it("returns an empty string without a prompt", () => {
    expect(interpolatePrompt(undefined, { a: "x" })).toBe("");
  });
});
