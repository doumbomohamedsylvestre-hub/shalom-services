"use client";

import { PlusIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, Money, SearchInput } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { RepairRow } from "@/components/dashboard/repairs/repair-row";
import { RepairStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RepairFilters } from "@/client/api";
import { useRepairs } from "@/client/hooks";
import { useSession } from "@/client/session";
import { formatRelative } from "@/shared/format";
import { balanceDue } from "@/shared/domain/money";

type View = "ouvertes" | "file" | "miennes" | "prets" | "toutes";

export default function RepairsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <RepairsList />
    </Suspense>
  );
}

function RepairsList() {
  const { user, can } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isTech = user.role === "technician";
  const view = (params.get("vue") as View | null) ?? (isTech ? "miennes" : "ouvertes");
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);

  const filters: RepairFilters = {
    q: deferredQ,
    ...(view === "ouvertes" && { status: "open" }),
    ...(view === "file" && { status: "open", technicianId: "unclaimed" }),
    ...(view === "miennes" && { status: "open", technicianId: user.id }),
    ...(view === "prets" && { status: "ready" }),
    ...(view === "toutes" && { status: "all" }),
  };
  const repairs = useRepairs(filters);

  const views: { value: View; label: string; show: boolean }[] = [
    { value: "miennes", label: "Mes réparations", show: isTech },
    { value: "ouvertes", label: "En cours", show: true },
    { value: "file", label: "À prendre", show: true },
    { value: "prets", label: "Prêts", show: true },
    { value: "toutes", label: "Toutes", show: true },
  ];

  return (
    <>
      <PageHeader
        title="Réparations"
        description="Tickets de l'atelier, du dépôt à la récupération."
        actions={
          can({ repair: ["create"] }) && (
            <Button variant="brand" render={<Link href={`${pathname}/nouvelle`} />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Nouvelle réparation
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(v) => router.replace(`${pathname}?vue=${v}`, { scroll: false })} className="scroll-x-hidden -mx-4 min-w-0 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max">
            {views
              .filter((v) => v.show)
              .map((v) => (
                <TabsTrigger key={v.value} value={v.value} className="px-3">
                  {v.label}
                </TabsTrigger>
              ))}
          </TabsList>
        </Tabs>
        <SearchInput value={q} onChange={setQ} placeholder="Code, client, téléphone, modèle…" className="lg:max-w-sm" />
      </div>

      {repairs.isLoading ? (
        <ListSkeleton />
      ) : repairs.isError ? (
        <ErrorState onRetry={() => repairs.refetch()} />
      ) : !repairs.data?.length ? (
        <EmptyState
          icon={WrenchIcon}
          title={q ? "Aucun résultat" : "Aucune réparation ici"}
          description={q ? "Essayez avec un autre code, nom ou numéro." : "Les tickets apparaîtront ici."}
        />
      ) : (
        <>
          {/* Phone: touch rows */}
          <Card className="gap-0 rounded-2xl p-1.5 md:hidden">
            <ul>
              {repairs.data.map((r) => (
                <li key={r.id}>
                  <RepairRow repair={r} />
                </li>
              ))}
            </ul>
          </Card>
          {/* Desktop: table */}
          <Card className="hidden rounded-2xl py-0 md:flex">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Ticket</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Technicien</TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                  <TableHead className="pr-5 text-right">Mis à jour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairs.data.map((r) => {
                  const due = balanceDue(r.lines, r.payments);
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`${pathname}/${r.id}`)}>
                      <TableCell className="pl-5">
                        <Link href={`${pathname}/${r.id}`} className="font-mono text-xs font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {r.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {r.device.brand} {r.device.model}
                        </div>
                        <div className="max-w-56 truncate text-xs text-muted-foreground">{r.fault}</div>
                      </TableCell>
                      <TableCell>{r.customer.name}</TableCell>
                      <TableCell>
                        <RepairStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className={r.technician ? "" : "text-muted-foreground italic"}>{r.technician?.name ?? "Non assigné"}</TableCell>
                      <TableCell className="text-right">{due > 0 ? <Money value={due} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="pr-5 text-right text-muted-foreground" suppressHydrationWarning>
                        {formatRelative(r.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground">{repairs.data.length} ticket(s)</p>
        </>
      )}
    </>
  );
}
