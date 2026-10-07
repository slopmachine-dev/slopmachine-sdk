// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/index";

describe("renderMarkdown (without a DOM)", () => {
  it("HTML-escapes the Markdown instead of rendering unsanitized HTML", () => {
    expect(renderMarkdown('# Hi <img src=x onerror="alert(1)">')).toBe(
      "# Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});
