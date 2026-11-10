"use client";

import {
  ArrowLeftIcon,
  BanIcon,
  FileTextIcon,
  HandIcon,
  PhoneIcon,
  PrinterIcon,
  ReceiptIcon,
  TicketIcon,
  TrashIcon,
  UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { ErrorState, ListSkeleton, Money, VoidDialog, useTarget } from "@/components/dashboard/kit";
import { AddLineButton } from "@/components/dashboard/lines-editor";
import { RepairStatusBadge } from "@/components/status-badge";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddRepairLine,
  useAssignRepair,
  useChangeRepairStatus,
  useClaimRepair,
  useRecordRepairPayment,
  useRemoveRepairLine,
  useRepair,
  useSettings,
  useStaff,
  useUpdateDiagnosis,
  useVoidPayment,
} from "@/client/hooks";
import { useSession } from "@/client/session";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD, REPAIR_MODE, REPAIR_STATUS } from "@/shared/domain/labels";
import { balanceDue, lineTotal, linesTotal, paidTotal } from "@/shared/domain/money";
import { nextStatuses } from "@/shared/domain/repair-flow";
import type { Repair, RepairStatus } from "@/shared/domain/types";
import { formatDate, formatDateTime, formatPhone, formatXOF } from "@/shared/format";
import { waLink } from "@/shared/phone";
import { paymentSchema, type PaymentInput } from "@/shared/schemas/staff";

const ACTION_LABEL: Partial<Record<RepairStatus, string>> = {
  diagnosing: "Commencer le diagnostic",
  quote_sent: "Marquer le devis envoyé",
  approved: "Devis accepté",
  refused: "Devis refusé",
  in_repair: "Lancer la réparation",
  waiting_parts: "En attente de pièces",
  ready: "Marquer prêt",
  picked_up: "Remettre au client",
  unrepairable: "Irréparable",
  returned_unrepaired: "Rendre sans réparation",
  cancelled: "Annuler le ticket",
};
const SECONDARY: RepairStatus[] = ["unrepairable", "returned_unrepaired", "cancelled", "waiting_parts", "refused"];

export default function RepairDetailPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <RepairDetail />
    </Suspense>
  );
}

function RepairDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = useSearchParams().get("nouveau") === "1";
  const q = useRepair(id);

  if (q.isLoading) return <ListSkeleton rows={8} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const r = q.data;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Button variant="ghost" className="-ml-2 w-fit" render={<Link href="/tableau-de-bord/reparations" />} nativeButton={false}>
        <ArrowLeftIcon data-icon="inline-start" />
        Réparations
      </Button>

      {isNew && (
        <Alert className="rounded-2xl border-success/30 bg-success/8">
          <TicketIcon className="text-success" />
          <AlertTitle>Ticket {r.code} créé</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            Imprimez le ticket et remettez-le au client : il y trouvera son code de suivi.
            <Button size="sm" render={<Link href={`/impression/ticket/${r.id}`} target="_blank" />} nativeButton={false}>
              <PrinterIcon data-icon="inline-start" />
              Imprimer le ticket
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Header repair={r} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatusActions repair={r} />
          <DeviceCard repair={r} />
          <LinesCard repair={r} />
          <PaymentsCard repair={r} />
        </div>
        <div className="flex flex-col gap-6">
          <TotalsCard repair={r} />
          <CustomerCard repair={r} />
          <TimelineCard repair={r} />
        </div>
      </div>
    </div>
  );
}

function Header({ repair: r }: { repair: Repair }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] md:text-[1.75rem]">
            {r.device.brand} {r.device.model}
          </h1>
          <RepairStatusBadge status={r.status} className="h-6 px-2.5" />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{r.code}</span> · {REPAIR_MODE[r.mode].label} · déposé le {formatDate(r.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <TechnicianControl repair={r} />
        <PrintMenu repair={r} />
      </div>
    </div>
  );
}

function TechnicianControl({ repair: r }: { repair: Repair }) {
  const { user, can } = useSession();
  const claim = useClaimRepair();
  const assign = useAssignRepair();
  const staff = useStaff();
  const open = !["picked_up", "cancelled", "returned_unrepaired", "unrepairable"].includes(r.status);

  if (can({ repair: ["assign"] })) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <UserCogIcon data-icon="inline-start" />
          {r.technician?.name ?? "Assigner"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {(staff.data ?? [])
            .filter((u) => u.role === "technician" && !u.banned)
            .map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => assign.mutate({ id: r.id, technicianId: u.id })}>
                {u.name}
                {r.technician?.id === u.id && <Badge variant="secondary" className="ml-auto">Actuel</Badge>}
              </DropdownMenuItem>
            ))}
          {r.technician && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => assign.mutate({ id: r.id, technicianId: null })}>Remettre dans la file</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (!r.technician && open && can({ repair: ["claim"] })) {
    return (
      <Button variant="brand" disabled={claim.isPending} onClick={() => claim.mutate({ id: r.id, technician: { id: user.id, name: user.name } })}>
        <HandIcon data-icon="inline-start" />
        Prendre en charge
      </Button>
    );
  }
  return r.technician ? <Badge variant="secondary" className="h-10 px-3 md:h-9">Technicien : {r.technician.name}</Badge> : null;
}

function PrintMenu({ repair: r }: { repair: Repair }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <PrinterIcon data-icon="inline-start" />
        Imprimer
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link href={`/impression/ticket/${r.id}`} target="_blank" />}>
          <TicketIcon />
          Ticket de dépôt (80 mm)
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!r.lines.length} render={<Link href={`/impression/devis/${r.id}`} target="_blank" />}>
          <FileTextIcon />
          Devis (A4)
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!r.payments.length} render={<Link href={`/impression/facture/${r.id}`} target="_blank" />}>
          <ReceiptIcon />
          Facture (A4)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusActions({ repair: r }: { repair: Repair }) {
  const { can } = useSession();
  const change = useChangeRepairStatus();
  const settings = useSettings();
  const next = nextStatuses(r.mode, r.status).filter((s) =>
    s === "approved" || s === "refused" ? can({ repair: ["quote-decision"] }) : can({ repair: ["set-status"] }),
  );
  const due = balanceDue(r.lines, r.payments);
  const primary = next.filter((s) => !SECONDARY.includes(s));
  const secondary = next.filter((s) => SECONDARY.includes(s));
  const device = `${r.device.brand} ${r.device.model}`;
  const template =
    r.status === "quote_sent"
      ? settings.data?.whatsappTemplates.quoteReady
      : r.status === "ready"
        ? settings.data?.whatsappTemplates.repairReady
        : undefined;
  const message = template
    ?.replace("{client}", r.customer.name.split(" ")[0]!)
    .replace("{appareil}", device)
    .replace("{montant}", formatXOF(linesTotal(r.lines)))
    .replace("{code}", r.code);

  if (!next.length && !message) return null;

  return (
    <Card className="rounded-2xl bg-linear-to-br from-card to-muted/60">
      <CardHeader>
        <CardTitle>Prochaine étape</CardTitle>
        <CardDescription>{REPAIR_STATUS[r.status].publicLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {r.status === "ready" && due > 0 && (
          <p className="rounded-xl bg-warning/12 px-3 py-2 text-sm">
            Solde à encaisser avant la remise : <strong className="tabular-nums">{formatXOF(due)}</strong>
          </p>
        )}
        {r.status === "diagnosing" && !r.lines.length && (
          <p className="rounded-xl bg-info/8 px-3 py-2 text-sm">Ajoutez les lignes du devis avant de l&apos;envoyer au client.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {message && (
            <Button className="bg-[#25D366] text-white hover:bg-[#1fbe5b]" render={<a href={waLink(r.customer.phone, message)} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
              <WhatsAppIcon className="size-4" />
              {r.status === "quote_sent" ? "Envoyer le devis" : "Prévenir le client"}
            </Button>
          )}
          {primary.map((s) => (
            <Button
              key={s}
              variant={s === "ready" || s === "picked_up" || s === "approved" ? "brand" : "default"}
              disabled={change.isPending || (s === "picked_up" && due > 0) || (s === "quote_sent" && !r.lines.length)}
              onClick={() => change.mutate({ id: r.id, to: s })}
            >
              {ACTION_LABEL[s]}
            </Button>
          ))}
          {secondary.map((s) => (
            <Button key={s} variant={s === "refused" ? "outline" : "ghost"} disabled={change.isPending} onClick={() => change.mutate({ id: r.id, to: s })}>
              {ACTION_LABEL[s]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceCard({ repair: r }: { repair: Repair }) {
  const { can } = useSession();
  const update = useUpdateDiagnosis();
  const [diagnosis, setDiagnosis] = useState(r.diagnosis ?? "");
  const editable = can({ repair: ["update"] }) && !["picked_up", "cancelled", "returned_unrepaired"].includes(r.status);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Appareil et panne</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Item label="Panne signalée" className="sm:col-span-2">
            {r.fault}
          </Item>
          <Item label="Couleur">{r.device.color ?? "—"}</Item>
          <Item label="IMEI / série">{r.device.imei ? <span className="font-mono text-xs">{r.device.imei}</span> : "—"}</Item>
          <Item label="État au dépôt">{r.conditionNotes ?? "—"}</Item>
          <Item label="Accessoires laissés">{r.accessories ?? "—"}</Item>
          <Item label="Prêt estimé">{r.estimatedReadyAt ? formatDateTime(r.estimatedReadyAt) : "—"}</Item>
        </dl>
        <Separator />
        <div className="flex flex-col gap-2">
          <label htmlFor="diagnosis" className="text-sm font-medium">
            Diagnostic du technicien
          </label>
          {editable ? (
            <>
              <Textarea
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Ce qui a été constaté, pièces à remplacer…"
                className="min-h-24"
              />
              <Button
                variant="outline"
                className="w-fit"
                disabled={update.isPending || diagnosis === (r.diagnosis ?? "")}
                onClick={() => update.mutate({ id: r.id, diagnosis })}
              >
                Enregistrer le diagnostic
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{r.diagnosis || "Pas encore de diagnostic."}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Item({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function LinesCard({ repair: r }: { repair: Repair }) {
  const { can } = useSession();
  const add = useAddRepairLine();
  const remove = useRemoveRepairLine();
  const locked = ["quote_sent", "ready", "picked_up", "cancelled", "returned_unrepaired", "refused"].includes(r.status) || !can({ repair: ["update"] });
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{r.mode === "quote" ? "Devis et pièces" : "Prestations et pièces"}</CardTitle>
        <CardDescription>Les pièces sont déduites du stock à l&apos;ajout, au coût moyen du moment.</CardDescription>
        {!locked && (
          <CardAction>
            <AddLineButton sources={["service", "product"]} productKinds={["part"]} onAdd={(line) => add.mutate({ id: r.id, line })} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {r.lines.length ? (
          <ul className="flex flex-col divide-y">
            {r.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.label}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {l.qty} × {formatXOF(l.unitPrice)}
                    {l.discount > 0 && <span className="text-brand"> · remise {formatXOF(l.discount)}{l.discountBy && ` (${l.discountBy})`}</span>}
                  </p>
                </div>
                <Money value={lineTotal(l)} className="text-sm font-semibold" />
                {!locked && (
                  <Button variant="ghost" size="icon" aria-label="Retirer" disabled={remove.isPending} onClick={() => remove.mutate({ id: r.id, lineId: l.id })}>
                    <TrashIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {r.mode === "quote" ? "Le devis sera établi après le diagnostic." : "Aucune ligne."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ repair: r }: { repair: Repair }) {
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  const voidTarget = useTarget<string>();
  const voidPayment = useVoidPayment();
  const due = balanceDue(r.lines, r.payments);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Paiements</CardTitle>
        <CardDescription>Espèces, Orange Money, Moov Money ou virement. Aucun crédit.</CardDescription>
        {can({ payment: ["create"] }) && due > 0 && (
          <CardAction>
            <Button onClick={() => setOpen(true)}>Encaisser</Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {r.payments.length ? (
          <ul className="flex flex-col divide-y">
            {r.payments.map((p) => (
              <li key={p.id} className={cn("flex items-center gap-3 py-3", p.voided && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", p.voided && "line-through")}>
                    {p.kind === "deposit" ? "Acompte" : "Paiement"} · {PAYMENT_METHOD[p.method]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(p.at)} · {p.receivedBy}
                    {p.voided && <span className="text-destructive"> · annulé : {p.voided.reason}</span>}
                  </p>
                </div>
                <Money value={p.amount} className={cn("text-sm font-semibold", p.voided && "line-through")} />
                {can({ payment: ["void"] }) && !p.voided && (
                  <Button variant="ghost" size="icon" aria-label="Annuler le paiement" onClick={() => voidTarget.open(p.id)}>
                    <BanIcon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun paiement enregistré.</p>
        )}
      </CardContent>
      <PaymentDialog repair={r} open={open} onOpenChange={setOpen} due={due} />
      <VoidDialog
        open={voidTarget.isOpen}
        onOpenChange={(o) => !o && voidTarget.close()}
        title="Annuler ce paiement ?"
        description="Le paiement reste visible, barré, avec le motif. Cette action est enregistrée dans le journal."
        onConfirm={(reason) => voidPayment.mutateAsync({ repairId: r.id, paymentId: voidTarget.target!, reason })}
      />
    </Card>
  );
}

function PaymentDialog({ repair: r, open, onOpenChange, due }: { repair: Repair; open: boolean; onOpenChange: (o: boolean) => void; due: number }) {
  const record = useRecordRepairPayment();
  const form = useAppForm({
    defaultValues: { amount: due, method: "cash" } as PaymentInput,
    validators: { onSubmit: paymentSchema },
    onSubmit: async ({ value }) => {
      await record.mutateAsync({ id: r.id, payment: value });
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) form.reset({ amount: due, method: "cash" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Encaisser un paiement</DialogTitle>
            <DialogDescription>
              Reste à payer : <strong className="text-foreground tabular-nums">{formatXOF(due)}</strong>
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="amount">{(f) => <f.MoneyField label="Montant" />}</form.AppField>
            <form.AppField name="method">
              {(f) => <f.SelectField label="Moyen de paiement" options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />}
            </form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>Enregistrer</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TotalsCard({ repair: r }: { repair: Repair }) {
  const total = linesTotal(r.lines);
  const paid = paidTotal(r.payments);
  const due = Math.max(0, total - paid);
  return (
    <Card className="rounded-2xl bg-primary text-primary-foreground ring-0">
      <CardContent className="flex flex-col gap-4">
        <Row label="Total" value={total} />
        <Row label="Déjà payé" value={paid} />
        <Separator className="bg-white/15" />
        <div className="flex items-end justify-between">
          <span className="text-sm text-white/70">Reste à payer</span>
          <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", due === 0 && total > 0 && "text-[oklch(0.85_0.14_152)]")}>
            {formatXOF(due)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/70">{label}</span>
      <Money value={value} className="font-medium" />
    </div>
  );
}

function CustomerCard({ repair: r }: { repair: Repair }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Client</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={`/tableau-de-bord/clients/${r.customer.id}`} />} nativeButton={false}>
            Fiche
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="font-medium">{r.customer.name}</p>
          <p className="text-sm text-muted-foreground">{formatPhone(r.customer.phone)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" render={<a href={`tel:${r.customer.phone}`} />} nativeButton={false}>
            <PhoneIcon data-icon="inline-start" />
            Appeler
          </Button>
          <Button variant="outline" render={<a href={waLink(r.customer.phone)} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
            <WhatsAppIcon className="size-4 text-[#25D366]" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineCard({ repair: r }: { repair: Repair }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 border-l pl-5">
          {[...r.events].reverse().map((e, i) => (
            <li key={e.id} className="relative">
              <span className={cn("absolute top-1 -left-[1.62rem] size-3 rounded-full ring-4 ring-card", i === 0 ? "bg-brand" : "bg-border")} />
              <p className={cn("text-sm", i === 0 && "font-semibold")}>{REPAIR_STATUS[e.to].label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(e.at)} · {e.by}
              </p>
              {e.note && <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
