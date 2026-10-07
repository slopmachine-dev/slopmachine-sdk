import React from "react";
import type { SlopMachineError } from "@slopmachine/core";

/**
 * Content to render when generation or loading fails. Either a node, or a
 * function that receives the error and returns a node.
 */
export type SlopErrorFallback =
  React.ReactNode | ((error: SlopMachineError) => React.ReactNode);

interface ErrorOverlayProps {
  error: SlopMachineError;
  errorFallback?: SlopErrorFallback;
  /**
   * Message shown by the default error UI, e.g. "Failed to load image".
   */
  label: string;
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Internal overlay shown over the media slot when generation or loading fails.
 * Renders the consumer's `errorFallback` if provided, otherwise a default message.
 */
export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
  error,
  errorFallback,
  label,
}) => {
  if (errorFallback !== undefined) {
    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={overlayStyle}
      >
        {typeof errorFallback === "function"
          ? errorFallback(error)
          : errorFallback}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-muted"
      style={{ ...overlayStyle, backgroundColor: "var(--muted, #f3f4f6)" }}
      title={error.message}
    >
      <div
        className="flex flex-col items-center gap-2 text-muted-foreground"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--muted-foreground, #6b7280)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ width: "24px", height: "24px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-xs" style={{ fontSize: "0.75rem" }}>
          {label}
        </span>
      </div>
    </div>
  );
};
