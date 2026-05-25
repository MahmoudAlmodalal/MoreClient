import React from "react";
import { Link as WLink, useLocation } from "wouter";

type LinkProps = {
  href: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
};

function isHashOrExternal(href: string) {
  if (!href) return true;
  if (href.startsWith("#")) return true;
  if (href.startsWith("http://") || href.startsWith("https://")) return true;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;
  return false;
}

export default function Link({ href, children, ...rest }: LinkProps) {
  if (href && href.includes("#") && !href.startsWith("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  if (isHashOrExternal(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  // @ts-ignore wouter Link types
  return (
    <WLink href={href} {...rest}>
      {children as any}
    </WLink>
  );
}

export { useLocation };
