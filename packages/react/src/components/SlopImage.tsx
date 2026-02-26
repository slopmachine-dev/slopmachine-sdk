import React, { useMemo, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  buildImageUrl,
  interpolatePrompt,
  type SlopImageOptions,
} from "@slopmachine/core";

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SlopImageProps
  extends
    Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">,
    SlopImageOptions {}

export const SlopImage: React.FC<SlopImageProps> = ({
  prompt,
  className,
  aspectRatio = "1:1",
  model,
  variables = {},
  baseUrl,
  ...props
}) => {
  // Construct API URL
  const src = useMemo(
    () => buildImageUrl({ prompt, aspectRatio, variables, baseUrl, model }),
    [prompt, aspectRatio, variables, baseUrl, model],
  );

  const alt = useMemo(
    () => interpolatePrompt(prompt, variables) ?? "Generated image",
    [prompt, variables],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  if (src !== currentSrc) {
    setCurrentSrc(src);
    setIsLoading(true);
  }

  return (
    <>
      <style>{`
        @keyframes slop-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes slop-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div
        className={cn("relative overflow-hidden", className)}
        style={{
          aspectRatio: String(aspectRatio).replace(":", "/"),
          backgroundColor: "var(--muted, #f3f4f6)",
          position: "relative",
          overflow: "hidden",
        }}>
        {/* Loading overlay */}
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-muted transition-opacity duration-300",
            isLoading ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--muted, #f3f4f6)",
            opacity: isLoading ? 1 : 0,
            pointerEvents: isLoading ? "auto" : "none",
            transition: "opacity 300ms ease-in-out",
          }}>
          <div
            className="flex flex-col items-center gap-2"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}>
            <svg
              className="spinner size-6 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style={{
                width: "24px",
                height: "24px",
                color: "var(--muted-foreground, #6b7280)",
                animation: "slop-spin 1s linear infinite",
              }}>
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                style={{ opacity: 0.25 }}
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                style={{ opacity: 0.75 }}
              />
            </svg>
            <span
              className="text-xs text-muted-foreground"
              style={{
                fontSize: "0.75rem",
                color: "var(--muted-foreground, #6b7280)",
              }}>
              Loading...
            </span>
          </div>
        </div>

        {/* Shimmer effect underneath */}
        <div
          className={cn(
            "shimmer-effect absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted",
            isLoading ? "opacity-100" : "opacity-0",
          )}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(90deg, var(--muted, #f3f4f6) 0%, var(--muted-foreground, #e5e7eb) 50%, var(--muted, #f3f4f6) 100%)",
            backgroundSize: "200% 100%",
            animation: "slop-shimmer 2s ease-in-out infinite",
            opacity: isLoading ? 1 : 0,
            transition: "opacity 300ms",
          }}
        />

        {/* Image */}
        <img
          key={src}
          src={src}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            transition: "opacity 500ms",
            opacity: isLoading ? 0 : 1,
          }}
          {...props}
        />
      </div>
    </>
  );
};
