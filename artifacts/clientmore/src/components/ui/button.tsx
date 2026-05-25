import React from "react";
import Link from "@/lib/next-shim/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "gradient-brand text-white shadow-[var(--shadow-brand)] hover:brightness-110 hover:-translate-y-0.5",
  secondary:
    "bg-white text-brand-700 hover:bg-brand-50 border border-transparent",
  outline:
    "border border-white/15 text-white hover:bg-white/5 hover:border-white/25",
  ghost: "text-current hover:bg-current/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | "href">;

const stripButtonStyleProps = <T extends Record<string, unknown>>(props: T) => {
  const rest = { ...props };
  delete rest.variant;
  delete rest.size;
  delete rest.className;
  delete rest.children;
  delete rest.href;
  return rest;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if ("href" in props && props.href !== undefined) {
    const { href } = props;
    const rest = stripButtonStyleProps(props as unknown as Record<string, unknown>);
    return (
      <Link
        href={href}
        className={cls}
        {...(rest as Omit<
          React.AnchorHTMLAttributes<HTMLAnchorElement>,
          keyof CommonProps | "href"
        >)}
      >
        {children}
      </Link>
    );
  }

  const rest = stripButtonStyleProps(props as unknown as Record<string, unknown>);
  return (
    <button className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
