"use client";

import { useSyncExternalStore } from "react";

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  subscribers.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subscribers.forEach((s) => s());
    }, 60_000);
  }
  return () => {
    subscribers.delete(cb);
    if (!subscribers.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Current time in ms, refreshed every minute; 0 during prerender/SSR.
 * Keeps components pure (no Date.now() in render) and prerender-safe.
 */
export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => (now ||= Date.now()),
    () => 0,
  );
}
