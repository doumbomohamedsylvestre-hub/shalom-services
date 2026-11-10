"use client";

import { WifiOffIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** The app is online-only (SPEC §5): say so clearly instead of failing silently. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-sm font-medium text-[color-mix(in_oklch,var(--warning),black_45%)]">
      <WifiOffIcon className="size-4" />
      Pas de connexion internet. Les modifications ne seront pas enregistrées.
    </div>
  );
}
