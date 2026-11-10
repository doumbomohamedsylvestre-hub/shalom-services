"use client";

import { ChevronRightIcon, SmartphoneIcon } from "lucide-react";
import Link from "next/link";
import { RepairStatusBadge } from "@/components/status-badge";
import { useNow } from "@/client/use-now";
import { formatRelative } from "@/shared/format";
import type { Repair } from "@/shared/domain/types";

/** Compact, touch-friendly repair row (lists, dashboard, phone layouts). */
export function RepairRow({ repair: r }: { repair: Repair }) {
  const now = useNow();
  const overdue =
    !!now && !!r.estimatedReadyAt && new Date(r.estimatedReadyAt).getTime() < now && !["ready", "picked_up"].includes(r.status);
  return (
    <Link
      href={`/tableau-de-bord/reparations/${r.id}`}
      className="group flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/6 text-primary">
        <SmartphoneIcon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {r.device.brand} {r.device.model}
        </span>
        <p className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          <span className="font-mono text-[0.7rem]">{r.code}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{r.customer.name}</span>
          <span className="hidden truncate sm:inline">· {r.fault}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <RepairStatusBadge status={r.status} />
        <span className={overdue ? "text-[0.7rem] font-medium whitespace-nowrap text-destructive" : "text-[0.7rem] whitespace-nowrap text-muted-foreground"} suppressHydrationWarning>
          {overdue ? "En retard" : now ? formatRelative(r.updatedAt, now) : ""}
        </span>
      </div>
      <ChevronRightIcon className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
