import React from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md",
  secondary:
    "bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20 border border-transparent",
  outline:
    "border border-border-custom text-foreground bg-card hover:bg-background hover:text-foreground",
  ghost: "text-current hover:bg-foreground/5",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs sm:text-sm",
  md: "px-4.5 py-2 text-sm sm:text-base",
  lg: "px-6 py-3 text-base",
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
