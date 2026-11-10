"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * true in the browser, false during prerender/SSR. Use it before reading
 * the clock (Date) or other per-visit values: Next.js 16 rejects them in a
 * prerender.
 */
export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}
