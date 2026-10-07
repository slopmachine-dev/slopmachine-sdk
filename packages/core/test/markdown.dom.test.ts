// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/index";

describe("renderMarkdown (with a DOM)", () => {
  it("renders Markdown to HTML", () => {
    const html = renderMarkdown("# Title\n\n**bold** [link](https://x.dev)");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://x.dev">link</a>');
  });

  it("strips scripts, event handlers, javascript: links and iframes", () => {
    const html = renderMarkdown(
      [
        '<img src="x" onerror="alert(1)">',
        "<script>alert(2)</script>",
        "[click](javascript:alert(3))",
        '<iframe src="https://evil.dev"></iframe>',
        '<a href="#" onclick="alert(4)">a</a>',
      ].join("\n\n"),
    );
    expect(html).not.toMatch(/onerror|onclick|<script|javascript:|<iframe/i);
    expect(html).toContain('<img src="x">');
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
