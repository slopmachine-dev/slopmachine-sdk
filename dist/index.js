"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SlopImage: () => SlopImage
});
module.exports = __toCommonJS(index_exports);

// src/components/SlopImage.tsx
var import_react = require("react");
var import_clsx = require("clsx");
var import_tailwind_merge = require("tailwind-merge");
var import_jsx_runtime = require("react/jsx-runtime");
function cn(...inputs) {
  return (0, import_tailwind_merge.twMerge)((0, import_clsx.clsx)(inputs));
}
var RESERVED_PROPS = [
  "prompt",
  "className",
  "style",
  "alt",
  "width",
  "height",
  "loading",
  "aspectRatio"
];
var SlopImage = ({
  prompt,
  className,
  aspectRatio = "1:1",
  ...props
}) => {
  const { finalPrompt } = (0, import_react.useMemo)(() => {
    let text = prompt;
    Object.keys(props).forEach((key) => {
      if (RESERVED_PROPS.includes(key)) return;
      const value = props[key];
      text = text.replace(new RegExp(`{${key}}`, "g"), String(value));
    });
    return { finalPrompt: text };
  }, [prompt, props]);
  const baseUrl = "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage";
  const params = new URLSearchParams({
    prompt: finalPrompt,
    aspectRatio: String(aspectRatio)
  });
  if (props.style && !prompt.includes("{style}")) {
    params.append("style", String(props.style));
  }
  const src = `${baseUrl}?${params.toString()}`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "img",
    {
      src,
      alt: finalPrompt,
      className: cn("bg-gray-100 object-cover", className),
      ...props
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SlopImage
});
