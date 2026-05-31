import React from "react";

type CardTone = "dark" | "glass" | "light";

const tones: Record<CardTone, string> = {
  dark: "bg-card border border-border text-card-foreground",
  glass: "glass",
  light: "bg-surface border border-border text-foreground",
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
