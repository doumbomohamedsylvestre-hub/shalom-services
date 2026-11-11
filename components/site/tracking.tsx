"use client";

import { CheckIcon, ClockIcon, RotateCcwIcon, SmartphoneIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { RepairStatusBadge } from "@/components/status-badge";
import { useTrackRepair } from "@/client/hooks";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/shared/format";
import { REPAIR_STATUS } from "@/shared/domain/labels";
import type { RepairStatus, TrackingResult } from "@/shared/domain/types";
import { trackingSchema } from "@/shared/schemas/public";

const STEPS: { key: string; label: string; matches: RepairStatus[] }[] = [
  { key: "received", label: "Reçu", matches: ["received"] },
  { key: "diag", label: "Diagnostic", matches: ["diagnosing", "quote_sent", "approved", "refused"] },
  { key: "repair", label: "Réparation", matches: ["in_repair", "waiting_parts"] },
  { key: "ready", label: "Prêt", matches: ["ready"] },
  { key: "done", label: "Récupéré", matches: ["picked_up"] },
];

function stepIndex(status: RepairStatus) {
  const i = STEPS.findIndex((s) => s.matches.includes(status));
  return i === -1 ? 0 : i;
}

export function Tracking() {
  const params = useSearchParams();
  const track = useTrackRepair();
  const [result, setResult] = useState<TrackingResult | null>(null);

  const form = useAppForm({
    defaultValues: { code: params.get("code") ?? "", phone: "" },
    validators: { onSubmit: trackingSchema },
    onSubmit: async ({ value }) => {
      setResult(await track.mutateAsync(trackingSchema.parse(value)));
    },
  });

  if (result) return <TrackingResultView result={result} onReset={() => setResult(null)} />;

  return (
    <Card className="mx-auto w-full max-w-lg rounded-3xl p-2 shadow-[0_30px_60px_-30px] shadow-primary/25">
      <CardContent className="p-5 md:p-7">
        <form onSubmit={onFormSubmit(form)} noValidate>
          <FieldGroup className="gap-5">
            <form.AppField name="code">
              {(f) => (
                <f.TextField label="Code de suivi" placeholder="SS-7K3M9Q" autoComplete="off" description="Imprimé sur votre ticket de dépôt." />
              )}
            </form.AppField>
            <form.AppField name="phone">
              {(f) => <f.PhoneField label="Numéro de téléphone" description="Celui donné au dépôt de l'appareil." />}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton size="lg" variant="brand" className="w-full" pendingLabel="Recherche…">
                Voir l&apos;avancement
              </form.SubmitButton>
            </form.AppForm>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function TrackingResultView({ result, onReset }: { result: TrackingResult; onReset: () => void }) {
  const current = stepIndex(result.status);
  const terminalOff = ["refused", "unrepairable", "returned_unrepaired", "cancelled"].includes(result.status);
  return (
    <div className="mx-auto flex w-full max-w-2xl animate-in flex-col gap-6 duration-300 fade-in slide-in-from-bottom-2">
      <Card className="rounded-3xl">
        <CardContent className="flex flex-col gap-7 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/8 text-primary">
                <SmartphoneIcon className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">{result.device}</p>
                <p className="text-sm text-muted-foreground">
                  Ticket <span className="font-mono font-medium text-foreground">{result.code}</span> · {result.maskedName}
                </p>
              </div>
            </div>
            <RepairStatusBadge status={result.status} className="h-7 px-3 text-sm" />
          </div>

          <div className="rounded-2xl bg-muted p-5">
            <p className="text-lg font-semibold tracking-tight">{REPAIR_STATUS[result.status].publicLabel}</p>
            {result.estimatedReadyAt && !terminalOff && result.status !== "picked_up" && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <ClockIcon className="size-4" />
                Prêt estimé : {formatDate(result.estimatedReadyAt)}
              </p>
            )}
          </div>

          {!terminalOff && (
            <ol className="grid grid-cols-5 gap-2" aria-label="Étapes de la réparation">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex flex-col gap-2">
                  <span className={cn("h-1.5 rounded-full transition-colors", i <= current ? "bg-brand" : "bg-border")} />
                  <span className={cn("text-xs", i <= current ? "font-medium text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-col gap-1">
            <p className="mb-3 text-sm font-semibold">Historique</p>
            <ol className="relative flex flex-col gap-5 border-l pl-6">
              {[...result.timeline].reverse().map((e, i) => (
                <li key={`${e.status}-${e.at}`} className="relative">
                  <span
                    className={cn(
                      "absolute top-0.5 -left-[1.95rem] grid size-4 place-items-center rounded-full ring-4 ring-card",
                      i === 0 ? "bg-brand text-brand-foreground" : "bg-border",
                    )}
                  >
                    {i === 0 && <CheckIcon className="size-2.5" strokeWidth={3} />}
                  </span>
                  <p className={cn("text-sm", i === 0 ? "font-semibold" : "text-muted-foreground")}>{REPAIR_STATUS[e.status].publicLabel}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
      <Button variant="ghost" className="mx-auto" onClick={onReset}>
        <RotateCcwIcon data-icon="inline-start" />
        Suivre un autre appareil
      </Button>
    </div>
  );
}
