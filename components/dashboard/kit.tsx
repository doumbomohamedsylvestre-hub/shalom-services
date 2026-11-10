"use client";

/** Small building blocks shared by back-office screens. */
import { type LucideIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatXOF } from "@/shared/format";
import { voidSchema } from "@/shared/schemas/staff";

export function Money({ value, className, muted }: { value: number; className?: string; muted?: boolean }) {
  return <span className={cn("tabular-nums whitespace-nowrap", muted && "text-muted-foreground", className)}>{formatXOF(value)}</span>;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "default",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "brand" | "warning" | "success";
  loading?: boolean;
}) {
  const body = (
    <Card className={cn("h-full gap-3 rounded-2xl transition-shadow", href && "hover:shadow-md")}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              tone === "brand" && "bg-brand/12 text-brand",
              tone === "warning" && "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_35%)]",
              tone === "success" && "bg-success/12 text-success",
              tone === "default" && "bg-primary/8 text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.985] transition-transform">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <InputGroup className={cn("w-full sm:max-w-xs", className)}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </InputGroup>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty className="rounded-2xl border border-dashed py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-12 text-center">
      <p className="font-medium">Impossible de charger les données.</p>
      <p className="text-sm text-muted-foreground">Vérifiez la connexion puis réessayez.</p>
      <Button variant="outline" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}

/** Void with a mandatory reason (money/stock records are never deleted). */
export function VoidDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const form = useAppForm({
    defaultValues: { reason: "" },
    validators: { onSubmit: voidSchema },
    onSubmit: async ({ value }) => {
      await onConfirm(value.reason);
      form.reset();
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="reason">
              {(f) => <f.TextareaField label="Motif de l'annulation" placeholder="Ex. erreur de saisie, client a changé d'avis…" rows={3} />}
            </form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Retour
            </Button>
            <form.AppForm>
              <form.SubmitButton variant="destructive">Annuler l&apos;opération</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Small hook to drive a dialog that targets one record. */
export function useTarget<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, open: (t: T) => setTarget(t), close: () => setTarget(null), isOpen: target !== null };
}
