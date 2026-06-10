import React from "react";

type CardTone = "dark" | "glass" | "light";

const tones: Record<CardTone, string> = {
  dark: "bg-card border border-border-custom text-foreground shadow-sm",
  glass: "glass text-foreground shadow-sm",
  light: "bg-background border border-border-custom text-foreground shadow-sm",
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
