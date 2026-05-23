"use client";

import { useEffect } from "react";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-4 text-gray-600 max-w-md">
        An unexpected error occurred. Our team has been notified. Please try again.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:border-gray-400 transition-colors"
        >
          Return home
        </a>
      </div>
    </div>
  );
}
