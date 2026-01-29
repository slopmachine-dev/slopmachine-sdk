import React, { useMemo } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SlopImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "style"
> {
  prompt: string;
  style?: string;
  // Dynamic props mapping
  [key: string]: any;
}

// Known props to exclude from prompt interpolation
const RESERVED_PROPS = [
  "prompt",
  "className",
  "alt",
  "width",
  "height",
  "loading",
  "aspectRatio",
];

export const SlopImage: React.FC<SlopImageProps> = ({
  prompt,
  className,
  aspectRatio = "1:1",
  style,
  ...props
}) => {
  // Interpolate prompt
  const finalPrompt = useMemo(() => {
    let text = prompt;

    // Combine props and style for interpolation
    const interpolationProps: Record<string, any> = { ...props, style };

    Object.keys(interpolationProps).forEach((key) => {
      if (RESERVED_PROPS.includes(key)) return;

      const value = interpolationProps[key];
      // Replace {key} with value
      if (value !== undefined && value !== null) {
        text = text.replace(new RegExp(`{${key}}`, "g"), String(value));
      }
    });
    return text;
  }, [prompt, props, style]);

  // Construct API URL
  const baseUrl =
    "https://us-central1-slopmachine-12bfb.cloudfunctions.net/renderImage";
  const params = new URLSearchParams({
    prompt: finalPrompt,
    aspectRatio: String(aspectRatio),
  });

  const src = `${baseUrl}?${params.toString()}`;

  return (
    <img
      src={src}
      alt={finalPrompt}
      className={cn("object-cover", className)}
      {...props}
    />
  );
};
