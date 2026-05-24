"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads the logged-in user's role from `sessionStorage` (`"admin" | "user" | null`).
 *
 * Uses `useSyncExternalStore` rather than a `useEffect` + `setState` pair so that
 * reading this browser-only external store doesn't trip `react-hooks/set-state-in-effect`
 * and stays SSR-safe: the server snapshot is always `null`, and React reconciles the
 * real client value on hydration. The `storage` subscription propagates cross-tab logout.
 */
const ROLE_KEY = "userRole";

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ROLE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export function useSessionRole(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
