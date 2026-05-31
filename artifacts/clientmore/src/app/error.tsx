"use client";

import Link from "@/lib/next-shim/link";
import { useEffect } from "react";
import { RotateCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/20 bg-danger/10">
        <RotateCw className="h-7 w-7 text-danger" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-fg">
        An unexpected error occurred. Our team has been notified. Please try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-fg">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Return home
        </Link>
      </div>
    </div>
  );
}
