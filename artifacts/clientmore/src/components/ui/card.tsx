import React from "react";

type CardTone = "dark" | "glass" | "light";

const tones: Record<CardTone, string> = {
  dark: "bg-[var(--card-bg)] border border-[var(--border)]",
  glass: "glass",
  light: "bg-white border border-[var(--border-light)] text-[var(--foreground-light)]",
};

export function Card({
  tone = "dark",
  className = "",
  children,
  ...rest
}: {
  tone?: CardTone;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl p-6 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
