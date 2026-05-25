import React from "react";

type SpinnerSize = "sm" | "md" | "lg";

const sizeMap: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
};

/**
 * Brand loading spinner. A single source of truth so every "fetching" state
 * looks the same. Decorative by default (aria-hidden); pass a `label` to
 * announce the loading state to screen readers via an sr-only live region.
 */
export function Spinner({
  size = "md",
  className = "",
  label,
}: {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      className="inline-flex items-center justify-center"
    >
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-brand-500 border-t-transparent ${sizeMap[size]} ${className}`}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
