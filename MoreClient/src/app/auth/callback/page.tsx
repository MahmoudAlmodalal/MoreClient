"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeSocialAuth } from "@/lib/api";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Missing code or state parameters from authentication redirect.");
      return;
    }

    const codeStr = code;
    const stateStr = state;

    let isMounted = true;
    
    async function exchangeCode() {
      try {
        const session = await completeSocialAuth(codeStr, stateStr);
        if (isMounted) {
          router.push(session.redirectTo || "/dashboard");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to complete authentication.");
        }
      }
    }

    exchangeCode();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] p-6 text-center text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-[#0d0d15] p-8 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-950/30 text-red-400 border border-red-900/50">
            ⚠️
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Authentication Failed</h2>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button
            onClick={() => router.push("/welcome")}
            className="mt-6 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-500"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] text-white">
      <div className="flex flex-col items-center justify-center gap-4">
        <svg className="h-10 w-10 animate-spin text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-medium text-gray-300">Completing authentication, please wait...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050508] text-white">
        <div className="flex flex-col items-center justify-center gap-4">
          <svg className="h-10 w-10 animate-spin text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-medium text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
