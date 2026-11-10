"use client";

import { useIsClient } from "@/client/use-is-client";

export function CurrentYear() {
  const isClient = useIsClient();
  return <span>{isClient ? new Date().getFullYear() : ""}</span>;
}
