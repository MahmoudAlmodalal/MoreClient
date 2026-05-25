import React from "react";

type BadgeTone = "brand" | "neutral" | "solid";

const tones: Record<BadgeTone, string> = {
  brand:
    "bg-brand-500/10 text-brand-300 border border-brand-500/25",
  neutral: "bg-white/5 text-gray-300 border border-white/10",
  solid: "gradient-brand text-white border border-transparent",
};

export function Badge({
  tone = "brand",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
