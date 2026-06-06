import React from "react";

type BadgeTone = "brand" | "neutral" | "solid";

const tones: Record<BadgeTone, string> = {
  brand:
    "bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20",
  neutral: "bg-foreground/5 text-foreground/80 border border-border-custom",
  solid: "bg-accent text-white border border-transparent",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
