"use client";

import { BanIcon, PlusIcon, PrinterIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, Money, SearchInput, VoidDialog, useTarget } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSales, useVoidSale } from "@/client/hooks";
import { useSession } from "@/client/session";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD } from "@/shared/domain/labels";
import { linesTotal } from "@/shared/domain/money";
import { formatDateTime } from "@/shared/format";

export default function SalesPage() {
  const { can } = useSession();
  const sales = useSales();
  const voidSale = useVoidSale();
  const target = useTarget<string>();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q).toLowerCase();
  const list = (sales.data ?? []).filter(
    (s) => !dq || s.number.toLowerCase().includes(dq) || s.lines.some((l) => l.label.toLowerCase().includes(dq)) || s.customer?.name.toLowerCase().includes(dq),
  );

  return (
    <>
      <PageHeader
        title="Ventes"
        description="Ventes au comptoir : accessoires, pièces et téléphones."
        actions={
          can({ sale: ["create"] }) && (
            <Button variant="brand" render={<Link href="/tableau-de-bord/ventes/nouvelle" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Nouvelle vente
            </Button>
          )
        }
      />
      <SearchInput value={q} onChange={setQ} placeholder="N° de vente, article, client…" />
      {sales.isLoading ? (
        <ListSkeleton />
      ) : sales.isError ? (
        <ErrorState onRetry={() => sales.refetch()} />
      ) : !list.length ? (
        <EmptyState icon={ShoppingBagIcon} title="Aucune vente" />
      ) : (
        <Card className="rounded-2xl py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Vente</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead className="hidden md:table-cell">Paiement</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-0 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id} className={cn(s.voided && "opacity-60")}>
                  <TableCell className="pl-5">
                    <p className="font-mono text-xs font-medium">{s.number}</p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(s.at)}</p>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <p className={cn("truncate font-medium", s.voided && "line-through")}>{s.lines.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ""}${l.label}`).join(", ")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.customer?.name ?? "Client de passage"} · {s.soldBy}
                    </p>
                    {s.voided && (
                      <ToneBadge tone="danger" className="mt-1">
                        Annulée : {s.voided.reason}
                      </ToneBadge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{s.payments.map((p) => PAYMENT_METHOD[p.method]).join(" + ")}</TableCell>
                  <TableCell className="text-right">
                    <Money value={linesTotal(s.lines)} className={cn("font-semibold", s.voided && "line-through")} />
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Imprimer le reçu" render={<Link href={`/impression/recu/${s.id}`} target="_blank" />} nativeButton={false}>
                        <PrinterIcon />
                      </Button>
                      {can({ payment: ["void"] }) && !s.voided && (
                        <Button variant="ghost" size="icon" aria-label="Annuler la vente" onClick={() => target.open(s.id)}>
                          <BanIcon />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <VoidDialog
        open={target.isOpen}
        onOpenChange={(o) => !o && target.close()}
        title="Annuler cette vente ?"
        description="Les articles reviennent en stock. La vente reste visible, barrée, avec le motif."
        onConfirm={(reason) => voidSale.mutateAsync({ id: target.target!, reason })}
      />
    </>
  );
}
