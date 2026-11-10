"use client";

import { ArrowLeftIcon, PencilIcon, PhoneIcon, PlusIcon, ShoppingBagIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CustomerDialog } from "@/components/dashboard/customer-dialog";
import { EmptyState, ErrorState, ListSkeleton, Money } from "@/components/dashboard/kit";
import { RepairRow } from "@/components/dashboard/repairs/repair-row";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomer } from "@/client/hooks";
import { useSession } from "@/client/session";
import { linesTotal } from "@/shared/domain/money";
import { formatDate, formatPhone, initials } from "@/shared/format";
import { waLink } from "@/shared/phone";

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useSession();
  const q = useCustomer(id);
  const [editing, setEditing] = useState(false);
  if (q.isLoading) return <ListSkeleton rows={6} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const { customer: c, repairs, sales } = q.data;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Button variant="ghost" className="-ml-2 w-fit" render={<Link href="/tableau-de-bord/clients" />} nativeButton={false}>
        <ArrowLeftIcon data-icon="inline-start" />
        Clients
      </Button>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(c.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">{c.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatPhone(c.phone)} · client depuis le {formatDate(c.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href={`tel:${c.phone}`} />} nativeButton={false}>
            <PhoneIcon data-icon="inline-start" />
            Appeler
          </Button>
          <Button variant="outline" render={<a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
            <WhatsAppIcon className="size-4 text-[#25D366]" />
            WhatsApp
          </Button>
          {can({ customer: ["update"] }) && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Réparations" value={String(c.repairsCount)} />
        <Stat label="Achats" value={String(sales.length)} />
        <Stat label="Total payé" value={<Money value={c.totalSpent} />} />
      </div>

      {c.notes && (
        <Card className="rounded-2xl bg-muted/60 ring-0">
          <CardContent className="text-sm">{c.notes}</CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Réparations</CardTitle>
          {can({ repair: ["create"] }) && (
            <Button size="sm" variant="outline" render={<Link href="/tableau-de-bord/reparations/nouvelle" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Nouvelle
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-2 md:px-3">
          {repairs.length ? (
            <ul>
              {repairs.map((r) => (
                <li key={r.id}>
                  <RepairRow repair={r} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={WrenchIcon} title="Aucune réparation" />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Achats en boutique</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length ? (
            <ul className="divide-y">
              {sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.lines.map((l) => l.label).join(", ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.number} · {formatDate(s.at)}
                    </p>
                  </div>
                  <Money value={linesTotal(s.lines)} className="font-semibold" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShoppingBagIcon} title="Aucun achat" />
          )}
        </CardContent>
      </Card>
      <CustomerDialog open={editing} onOpenChange={setEditing} customer={c} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
