import React from "react";

type BadgeTone = "brand" | "neutral" | "solid";

const tones: Record<BadgeTone, string> = {
  brand:
    "bg-primary/10 text-primary border border-primary/25",
  neutral: "bg-muted text-muted-fg border border-border",
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
