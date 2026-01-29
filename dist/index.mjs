// src/components/SlopImage.tsx
import { useMemo } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsx } from "react/jsx-runtime";
function cn(...inputs) {
  return twMerge(clsx(inputs));
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
  const { finalPrompt } = useMemo(() => {
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
  return /* @__PURE__ */ jsx(
    "img",
    {
      src,
      alt: finalPrompt,
      className: cn("bg-gray-100 object-cover", className),
      ...props
    }
  );
};
export {
  SlopImage
};
