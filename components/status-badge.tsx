import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { INQUIRY_STATUS, REPAIR_STATUS, STOCK_MOVEMENT, type Tone } from "@/shared/domain/labels";
import type { InquiryStatus, RepairStatus, StockMovementType } from "@/shared/domain/types";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_35%)]",
  success: "bg-success/12 text-success",
  danger: "bg-destructive/10 text-destructive",
  brand: "bg-brand/12 text-[color-mix(in_oklch,var(--brand),black_18%)]",
};

export function ToneBadge({ tone, children, className, dot = true }: { tone: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border-0 font-medium", TONE[tone], className)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}

export function RepairStatusBadge({ status, className }: { status: RepairStatus; className?: string }) {
  const s = REPAIR_STATUS[status];
  return (
    <ToneBadge tone={s.tone} className={className}>
      {s.label}
    </ToneBadge>
  );
}

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const s = INQUIRY_STATUS[status];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

export function MovementBadge({ type }: { type: StockMovementType }) {
  const s = STOCK_MOVEMENT[type];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}
