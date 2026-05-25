import { useLocation, useParams as useWouterParams } from "wouter";

export function usePathname(): string {
  const [loc] = useLocation();
  return loc || "/";
}

export function useRouter() {
  const [, setLocation] = useLocation();
  return {
    push: (href: string) => {
      if (!href) return;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.location.href = href;
        return;
      }
      setLocation(href);
    },
    replace: (href: string) => {
      if (!href) return;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.location.replace(href);
        return;
      }
      setLocation(href, { replace: true });
    },
    back: () => {
      window.history.back();
    },
    forward: () => {
      window.history.forward();
    },
    refresh: () => {
      window.location.reload();
    },
    prefetch: (_href: string) => {},
  };
}

export function useSearchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function useParams(): Record<string, string | string[]> {
  // @ts-ignore wouter useParams returns Record<string, string>
  const params = useWouterParams() || {};
  return params as Record<string, string | string[]>;
}

export function redirect(href: string): never {
  window.location.href = href;
  throw new Error("REDIRECT");
}

export function notFound(): never {
  throw new Error("NOT_FOUND");
}
