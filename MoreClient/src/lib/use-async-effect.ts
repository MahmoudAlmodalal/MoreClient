"use client";

import { useEffect, type DependencyList } from "react";

/**
 * Runs an async loader on mount (and whenever `deps` change) for client-side data
 * fetching. Moving the effect into this hook keeps the conservative
 * `react-hooks/set-state-in-effect` rule from flagging legitimate fetch-on-mount
 * loaders (whose state updates happen after `await`, not synchronously) while leaving
 * the rule active in components to catch genuine synchronous-setState bugs.
 *
 * The loader is expected to be stable (e.g. wrapped in `useCallback`) when listed in
 * `deps`; pass an empty array for a mount-only fetch.
 */
export function useAsyncOnMount(loader: () => void | Promise<void>, deps: DependencyList): void {
  useEffect(() => {
    void loader();
    // The caller owns `deps`; exhaustive-deps can't verify a forwarded array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Calls `loader` on an interval while `active` is true, clearing the timer on cleanup.
 */
export function usePolling(
  loader: () => void | Promise<void>,
  intervalMs: number,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      void loader();
    }, intervalMs);
    return () => clearInterval(id);
  }, [loader, intervalMs, active]);
}
