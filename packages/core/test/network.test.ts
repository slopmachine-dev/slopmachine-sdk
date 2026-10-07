import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRenderUrl,
  createRenderUrlMonitor,
  executePipeline,
  rateResult,
  SlopMachineError,
  uploadTempAttachment,
} from "../src/index";

type Handler = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

function mockFetch(handler: Handler) {
  fetchMock = vi.fn<Handler>(handler);
  vi.stubGlobal("fetch", fetchMock);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// HEAD responses have no body; error detail comes from the follow-up GET
function apiError(message: string, status: number): Handler {
  return async (_url, init) =>
    init?.method === "HEAD"
      ? new Response(null, { status })
      : json({ error: message }, status);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SlopMachineError", () => {
  it("carries the message, status and name", () => {
    const err = new SlopMachineError("boom", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SlopMachineError");
    expect(err.message).toBe("boom");
    expect(err.status).toBe(500);
  });
});

describe("checkRenderUrl", () => {
  it("resolves with a single HEAD request when the URL is servable", async () => {
    mockFetch(async () => new Response(null, { status: 200 }));
    await expect(checkRenderUrl("https://api/x")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("HEAD");
  });

  it("throws the API's error message and status", async () => {
    mockFetch(apiError("Missing required variable 'theme'", 400));
    const err = await checkRenderUrl("https://api/x").catch((e) => e);
    expect(err).toBeInstanceOf(SlopMachineError);
    expect(err.message).toBe("Missing required variable 'theme'");
    expect(err.status).toBe(400);
  });

  it("reads nested { error: { message } } bodies", async () => {
    mockFetch(async (_url, init) =>
      init?.method === "HEAD"
        ? new Response(null, { status: 500 })
        : json({ error: { message: "Generation timed out" } }, 500),
    );
    await expect(checkRenderUrl("https://api/x")).rejects.toMatchObject({
      message: "Generation timed out",
      status: 500,
    });
  });

  it("falls back to the status text when the body is not JSON", async () => {
    mockFetch(
      async () =>
        new Response("<html>oops</html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
    );
    await expect(checkRenderUrl("https://api/x")).rejects.toMatchObject({
      message: "Bad Gateway",
      status: 502,
    });
  });

  it("rethrows network failures as-is", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch(async () => {
      throw networkError;
    });
    await expect(checkRenderUrl("https://api/x")).rejects.toBe(networkError);
  });

  it("passes the abort signal through", async () => {
    mockFetch(async () => new Response(null, { status: 200 }));
    const controller = new AbortController();
    await checkRenderUrl("https://api/x", { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});

describe("createRenderUrlMonitor", () => {
  it("reports an API error found by watch()", async () => {
    mockFetch(apiError("bad input", 400));
    const onError = vi.fn();
    createRenderUrlMonitor(onError).watch("https://api/a");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "bad input",
      status: 400,
    });
    expect(onError.mock.calls[0][1]).toBe("https://api/a");
  });

  it("reports nothing when the URL is servable and the media loads", async () => {
    mockFetch(async () => new Response(null, { status: 200 }));
    const onError = vi.fn();
    createRenderUrlMonitor(onError).watch("https://api/a");
    await flush();
    expect(onError).not.toHaveBeenCalled();
  });

  it("prefers the API's error detail when the media element fails first", async () => {
    const head = deferred<Response>();
    mockFetch(async (_url, init) =>
      init?.method === "HEAD"
        ? head.promise
        : json({ error: "bad input" }, 400),
    );
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    monitor.mediaFailed("https://api/a", "Failed to load image");
    await flush();
    expect(onError).not.toHaveBeenCalled();

    head.resolve(new Response(null, { status: 400 }));
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "bad input",
      status: 400,
    });
  });

  it("falls back to a generic error when the URL check passed", async () => {
    mockFetch(async () => new Response(null, { status: 200 }));
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    monitor.mediaFailed("https://api/a", "Failed to load image");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(SlopMachineError);
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "Failed to load image",
      status: undefined,
    });
  });

  it("falls back to a generic error when the URL check could not be made", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    await flush();
    // A network failure of the check alone is not reported
    expect(onError).not.toHaveBeenCalled();

    monitor.mediaFailed("https://api/a", "Failed to load video");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("Failed to load video");
  });

  it("works when the media element fails before watch() runs", async () => {
    mockFetch(apiError("bad input", 400));
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.mediaFailed("https://api/a", "Failed to load image");
    monitor.watch("https://api/a");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("bad input");
    // Both paths shared one HEAD request
    const heads = fetchMock.mock.calls.filter((c) => c[1]?.method === "HEAD");
    expect(heads).toHaveLength(1);
  });

  it("reports at most once per URL", async () => {
    mockFetch(apiError("bad input", 400));
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    monitor.watch("https://api/a");
    monitor.mediaFailed("https://api/a", "Failed to load image");
    monitor.mediaFailed("https://api/a", "Failed to load image");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("drops results for a URL that is no longer watched", async () => {
    const headA = deferred<Response>();
    mockFetch(async (url, init) => {
      if (url === "https://api/a" && init?.method === "HEAD")
        return headA.promise;
      if (url === "https://api/a") return json({ error: "stale" }, 400);
      return new Response(null, { status: 200 });
    });
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    monitor.watch("https://api/b");
    headA.resolve(new Response(null, { status: 400 }));
    await flush();
    expect(onError).not.toHaveBeenCalled();
  });

  it("aborts the previous check when the URL changes", async () => {
    mockFetch(async () => new Promise<Response>(() => {}));
    const monitor = createRenderUrlMonitor(vi.fn());
    monitor.watch("https://api/a");
    const signalA = fetchMock.mock.calls[0][1]?.signal;
    monitor.watch("https://api/b");
    expect(signalA?.aborted).toBe(true);
  });

  it("drops pending results after stop()", async () => {
    const head = deferred<Response>();
    mockFetch(async (_url, init) =>
      init?.method === "HEAD" ? head.promise : json({ error: "bad" }, 400),
    );
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/a");
    monitor.stop();
    head.resolve(new Response(null, { status: 400 }));
    await flush();
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports again after switching away from a failed URL and back", async () => {
    mockFetch(async (url, init) => {
      if (url === "https://api/bad")
        return apiError("bad input", 400)(url, init);
      return new Response(null, { status: 200 });
    });
    const onError = vi.fn();
    const monitor = createRenderUrlMonitor(onError);
    monitor.watch("https://api/bad");
    await flush();
    monitor.stop();
    monitor.watch("https://api/ok");
    await flush();
    monitor.stop();
    monitor.watch("https://api/bad");
    await flush();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});

describe("executePipeline", () => {
  it("POSTs a synchronous run and returns the result", async () => {
    mockFetch(async () => json({ id: "res1", status: "completed" }, 200));
    const result = await executePipeline({
      pipelineId: "p1",
      prompt: "go",
      variables: { a: 1 },
      baseUrl: "https://api/pipe",
    });
    expect(result).toMatchObject({ id: "res1", status: "completed" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api/pipe");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      pipelineId: "p1",
      prompt: "go",
      variables: { a: 1 },
      sync: true,
    });
  });

  it("throws with the API's error detail", async () => {
    mockFetch(async () => json({ error: "Pipeline not found" }, 404));
    await expect(executePipeline({ pipelineId: "nope" })).rejects.toThrow(
      "Pipeline execution failed (404): Pipeline not found",
    );
  });
});

describe("rateResult", () => {
  it("requires a resultId", async () => {
    await expect(rateResult("", "good")).rejects.toThrow(
      "resultId is required",
    );
  });

  it("POSTs the rating and returns the response", async () => {
    mockFetch(async () =>
      json({ success: true, resultId: "r1", rating: "good" }, 200),
    );
    await expect(rateResult("r1", "good")).resolves.toEqual({
      success: true,
      resultId: "r1",
      rating: "good",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      resultId: "r1",
      rating: "good",
    });
  });

  it("throws with the API's error detail", async () => {
    mockFetch(async () => json({ error: "Domain not allowed" }, 403));
    await expect(rateResult("r1", null)).rejects.toThrow(
      "Failed to rate result (403): Domain not allowed",
    );
  });
});

describe("uploadTempAttachment", () => {
  it("wraps the payload and returns the uploaded URL", async () => {
    mockFetch(async () => json({ result: { url: "https://cdn/x.png" } }, 200));
    await expect(uploadTempAttachment("AAAA", "image/png")).resolves.toEqual({
      url: "https://cdn/x.png",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      data: { base64: "AAAA", mimeType: "image/png" },
    });
  });

  it("throws on an error payload", async () => {
    mockFetch(async () => json({ error: { message: "Too large" } }, 200));
    await expect(uploadTempAttachment("AAAA", "image/png")).rejects.toThrow(
      "Failed to upload attachment: Too large",
    );
  });
});
