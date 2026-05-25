import React from "react";

type LogoVariant = "dark" | "light" | "mark";
type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { text: string; mark: number; gap: string }> = {
  sm: { text: "text-lg", mark: 18, gap: "gap-1" },
  md: { text: "text-2xl", mark: 24, gap: "gap-1.5" },
  lg: { text: "text-4xl", mark: 34, gap: "gap-2" },
};

/**
 * The smiley face that replaces the "O" in MORE — the clientMORE brand mark.
 * Uses currentColor so it inherits the surrounding text color.
 */
function SmileyMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="inline-block shrink-0 align-[-0.12em]"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="4" />
      <circle cx="11" cy="13" r="1.9" fill="currentColor" />
      <circle cx="21" cy="13" r="1.9" fill="currentColor" />
      <path
        d="M10 19c1.6 2.6 4 3.9 6 3.9s4.4-1.3 6-3.9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * clientMORE wordmark. The single source of truth for the brand mark.
 * - `dark`  — for dark backgrounds (light "client", gradient "MORE")
 * - `light` — for light backgrounds (dark "client", brand-purple "MORE")
 * - `mark`  — the smiley icon only
 */
export function Logo({
  variant = "dark",
  size = "md",
  className = "",
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}) {
  const s = sizeMap[size];

  if (variant === "mark") {
    return (
      <span className={`text-brand-500 ${className}`}>
        <SmileyMark size={s.mark} />
      </span>
    );
  }

  const clientColor = variant === "light" ? "text-gray-900" : "text-white";
  const moreColor = variant === "light" ? "text-brand-700" : "text-gradient-brand";

  return (
    <span
      className={`inline-flex items-baseline font-bold tracking-tight leading-none ${s.text} ${s.gap} ${className}`}
    >
      <span className={clientColor}>client</span>
      <span className={`inline-flex items-baseline ${moreColor}`}>
        M
        <span className="mx-[0.02em]">
          <SmileyMark size={s.mark} />
        </span>
        RE
      </span>
    </span>
  );
}
