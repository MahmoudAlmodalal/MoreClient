import React from "react";

/**
 * A shimmering placeholder block for loading states. The shimmer + dark base
 * and reduced-motion fallback live in the `.skeleton` class in globals.css.
 * Compose with sizing/rounding utilities, e.g.
 *   <Skeleton className="h-4 w-32 rounded" />
 */
export function Skeleton({
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton rounded-md ${className}`}
      {...rest}
    />
  );
}
