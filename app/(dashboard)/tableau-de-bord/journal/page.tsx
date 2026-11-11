"use client";

import { HistoryIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { EmptyState, ErrorState, ListSkeleton, SearchInput } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { ToneBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAudit } from "@/client/hooks";
import type { Tone } from "@/shared/domain/labels";
import { formatDateTime } from "@/shared/format";

const ACTION: Record<string, { label: string; tone: Tone }> = {
  create: { label: "Création", tone: "success" },
  void: { label: "Annulation", tone: "danger" },
  adjust: { label: "Ajustement", tone: "warning" },
  discount: { label: "Remise", tone: "brand" },
  ban: { label: "Désactivation", tone: "danger" },
  unban: { label: "Réactivation", tone: "info" },
  update: { label: "Modification", tone: "info" },
  receive: { label: "Réception", tone: "success" },
  role: { label: "Rôle", tone: "warning" },
  password: { label: "Mot de passe", tone: "warning" },
};

export default function AuditPage() {
  const audit = useAudit();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q).toLowerCase();
  const list = (audit.data ?? []).filter((a) => !dq || [a.actor, a.entity, a.entityRef, a.summary].some((v) => v.toLowerCase().includes(dq)));
  return (
    <>
      <PageHeader title="Journal" description="Qui a fait quoi, et quand : paiements, annulations, remises, stock et comptes." />
      <SearchInput value={q} onChange={setQ} placeholder="Personne, référence…" />
      {audit.isLoading ? (
        <ListSkeleton />
      ) : audit.isError ? (
        <ErrorState onRetry={() => audit.refetch()} />
      ) : !list.length ? (
        <EmptyState icon={HistoryIcon} title="Aucune entrée" />
      ) : (
        <Card className="rounded-2xl py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Quand</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détail</TableHead>
                <TableHead className="hidden pr-5 md:table-cell">Par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => {
                const act = ACTION[a.action] ?? { label: a.action, tone: "neutral" as Tone };
                return (
                  <TableRow key={a.id}>
                    <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{formatDateTime(a.at)}</TableCell>
                    <TableCell>
                      <ToneBadge tone={act.tone}>{act.label}</ToneBadge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {a.entity} <span className="font-mono text-xs text-muted-foreground">{a.entityRef}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{a.summary}</p>
                    </TableCell>
                    <TableCell className="hidden pr-5 md:table-cell">{a.actor}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
