"use client";

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxesIcon,
  CheckCircle2Icon,
  HandIcon,
  InboxIcon,
  PlusIcon,
  ShoppingBagIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState, ListSkeleton, StatCard } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { RepairRow } from "@/components/dashboard/repairs/repair-row";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSummary, useInquiries, useRepairs } from "@/client/hooks";
import { useSession } from "@/client/session";
import { useIsClient } from "@/client/use-is-client";
import { formatCompactXOF, formatRelative } from "@/shared/format";
import { INQUIRY_TYPE } from "@/shared/domain/labels";
import type { Repair } from "@/shared/domain/types";

const D = "/tableau-de-bord";

function Greeting({ name }: { name: string }) {
  const isClient = useIsClient();
  const h = isClient ? new Date().getHours() : 9;
  return (
    <>
      {h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"}, {name}
    </>
  );
}

export default function OverviewPage() {
  const { user, can } = useSession();
  const summary = useDashboardSummary();
  const s = summary.data;
  const isTech = user.role === "technician";

  return (
    <>
      <PageHeader
        title={<Greeting name={user.name.split(" ")[0]!} />}
        description={isTech ? "Vos réparations et la file d'attente de l'atelier." : "Ce qui demande votre attention aujourd'hui."}
        actions={
          <>
            {can({ sale: ["create"] }) && (
              <Button variant="outline" render={<Link href={`${D}/ventes/nouvelle`} />} nativeButton={false}>
                <ShoppingBagIcon data-icon="inline-start" />
                Vente
              </Button>
            )}
            {can({ repair: ["create"] }) && (
              <Button variant="brand" render={<Link href={`${D}/reparations/nouvelle`} />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                Nouvelle réparation
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Réparations ouvertes" value={s?.openRepairs} icon={WrenchIcon} loading={!s} href={`${D}/reparations`} />
        <StatCard
          label="À prendre en charge"
          value={s?.unclaimed}
          icon={HandIcon}
          tone="brand"
          loading={!s}
          href={`${D}/reparations?vue=file`}
        />
        <StatCard label="Prêts à récupérer" value={s?.readyForPickup} icon={CheckCircle2Icon} tone="success" loading={!s} href={`${D}/reparations?vue=prets`} />
        {can({ report: ["read"] }) ? (
          <StatCard
            label="Encaissé aujourd'hui"
            value={s ? formatCompactXOF(s.todayRevenue) : null}
            hint={s ? `30 jours : ${formatCompactXOF(s.monthRevenue)}` : undefined}
            icon={WalletIcon}
            loading={!s}
            href={`${D}/rapports`}
          />
        ) : (
          <StatCard label="En retard" value={s?.overdue} icon={AlertTriangleIcon} tone="warning" loading={!s} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr] md:gap-6">
        <div className="flex flex-col gap-4 md:gap-6">
          {isTech ? (
            <>
              <RepairsCard title="Mes réparations" description="Assignées à vous, en cours." filters={{ status: "open", technicianId: user.id }} />
              <RepairsCard title="File d'attente" description="Tickets sans technicien : prenez-en un." filters={{ status: "open", technicianId: "unclaimed" }} />
            </>
          ) : (
            <>
              <RepairsCard title="Prêts à récupérer" description="Prévenez le client et encaissez le solde." filters={{ status: "ready" }} />
              <RepairsCard title="Activité récente" description="Dernières réparations mises à jour." filters={{ status: "open" }} limit={6} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          {can({ inquiry: ["read"] }) && <InquiriesCard />}
          {can({ inventory: ["read"] }) && s && s.lowStock > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BoxesIcon className="size-4 text-warning" />
                  Stock bas
                </CardTitle>
                <CardDescription>
                  {s.lowStock} produit{s.lowStock > 1 ? "s" : ""} sous le seuil minimum.
                </CardDescription>
                <CardAction>
                  <Button variant="ghost" size="sm" render={<Link href={`${D}/stock?filtre=bas`} />} nativeButton={false}>
                    Voir
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          )}
          {s && s.overdue > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-warning" />
                  En retard
                </CardTitle>
                <CardDescription>
                  {s.overdue} réparation{s.overdue > 1 ? "s ont" : " a"} dépassé la date promise.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function RepairsCard({
  title,
  description,
  filters,
  limit = 5,
}: {
  title: string;
  description: string;
  filters: Parameters<typeof useRepairs>[0];
  limit?: number;
}) {
  const q = useRepairs(filters);
  const items: Repair[] = (q.data ?? []).slice(0, limit);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={`${D}/reparations`} />} nativeButton={false}>
            Tout voir
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 md:px-3">
        {q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : items.length ? (
          <ul className="flex flex-col">
            {items.map((r) => (
              <li key={r.id}>
                <RepairRow repair={r} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={CheckCircle2Icon} title="Rien à signaler" description="Cette liste est vide pour le moment." />
        )}
      </CardContent>
    </Card>
  );
}

function InquiriesCard() {
  const q = useInquiries();
  const items = (q.data ?? []).filter((i) => i.status === "new").slice(0, 4);
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Nouvelles demandes</CardTitle>
        <CardDescription>Envoyées depuis le site.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={`${D}/demandes`} />} nativeButton={false}>
            Boîte
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-2 md:px-3">
        {q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : items.length ? (
          items.map((i) => (
            <Link key={i.id} href={`${D}/demandes?id=${i.id}`} className="flex flex-col gap-1 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{i.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(i.createdAt)}</span>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {INQUIRY_TYPE[i.type]} · {i.message}
              </p>
            </Link>
          ))
        ) : (
          <EmptyState icon={InboxIcon} title="Boîte vide" description="Aucune nouvelle demande." />
        )}
      </CardContent>
    </Card>
  );
}
