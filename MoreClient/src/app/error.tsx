"use client";

import Link from "next/link";
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
      className="min-h-screen flex flex-col items-center justify-center bg-[#050508] px-4 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <RotateCw className="h-7 w-7 text-red-400" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">Something went wrong</h1>
      <p className="mt-4 max-w-md text-gray-400">
        An unexpected error occurred. Our team has been notified. Please try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-gray-600">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-white/25 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Return home
        </Link>
      </div>
    </div>
  );
}
