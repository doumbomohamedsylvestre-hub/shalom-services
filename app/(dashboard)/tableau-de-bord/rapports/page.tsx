"use client";

import { BarChart3Icon, BoxesIcon, ClockIcon, HandCoinsIcon, LockIcon, ReceiptIcon, ThumbsUpIcon, TrendingUpIcon, WrenchIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorState, ListSkeleton, Money, StatCard } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReport } from "@/client/hooks";
import { useSession } from "@/client/session";
import { useState } from "react";
import { REPAIR_STATUS } from "@/shared/domain/labels";
import type { ReportRange } from "@/shared/domain/types";
import { formatCompactXOF, formatNumber, formatXOF } from "@/shared/format";

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "3 mois" },
  { value: "12m", label: "12 mois" },
];

const revenueConfig = {
  repairs: { label: "Réparations", color: "var(--chart-1)" },
  sales: { label: "Ventes", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function ReportsPage() {
  const { can } = useSession();
  const [range, setRange] = useState<ReportRange>("30d");
  const report = useReport(range);

  if (!can({ report: ["read"] })) {
    return <EmptyState icon={LockIcon} title="Accès réservé" description="Les rapports financiers sont réservés à l'administrateur." />;
  }

  const d = report.data;
  return (
    <>
      <PageHeader
        title="Rapports"
        description="Chiffre d'affaires, marge, dépenses et activité de l'atelier."
        actions={
          <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as ReportRange)} variant="outline">
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />

      {report.isError ? (
        <ErrorState onRetry={() => report.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Chiffre d'affaires" value={d && formatCompactXOF(d.totals.revenue)} icon={TrendingUpIcon} loading={!d} />
            <StatCard label="Coût des pièces vendues" value={d && formatCompactXOF(d.totals.cogs)} icon={BoxesIcon} loading={!d} />
            <StatCard label="Dépenses" value={d && formatCompactXOF(d.totals.expenses)} icon={ReceiptIcon} tone="warning" loading={!d} />
            <StatCard
              label="Résultat net"
              value={d && formatCompactXOF(d.totals.net)}
              hint={d && `Marge ${Math.round((d.totals.net / Math.max(1, d.totals.revenue)) * 100)} %`}
              icon={HandCoinsIcon}
              tone="success"
              loading={!d}
            />
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Encaissements</CardTitle>
              <CardDescription>Réparations et ventes en boutique, par période.</CardDescription>
            </CardHeader>
            <CardContent>
              {!d ? (
                <ListSkeleton rows={4} />
              ) : (
                <ChartContainer config={revenueConfig} className="aspect-auto h-72 w-full">
                  <BarChart data={d.revenue} margin={{ left: 4, right: 4 }} barCategoryGap="22%">
                    <CartesianGrid vertical={false} strokeDasharray="0" className="stroke-border/60" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCompactXOF(v).replace(" FCFA", "")} />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={<ChartTooltipContent formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="size-2 rounded-[2px]" style={{ background: `var(--color-${name})` }} />
                            {revenueConfig[name as keyof typeof revenueConfig].label}
                          </span>
                          <span className="font-medium text-foreground tabular-nums">{formatXOF(Number(value))}</span>
                        </div>
                      )} />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="repairs" stackId="a" fill="var(--color-repairs)" stroke="var(--card)" strokeWidth={2} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="sales" stackId="a" fill="var(--color-sales)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Dépenses par catégorie</CardTitle>
              </CardHeader>
              <CardContent>{d ? <BarList items={d.expensesByCategory.map((e) => ({ label: e.category, value: e.amount, display: formatXOF(e.amount) }))} /> : <ListSkeleton rows={5} />}</CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Réparations par statut</CardTitle>
              </CardHeader>
              <CardContent>
                {d ? (
                  <BarList
                    items={d.repairsByStatus
                      .sort((a, b) => b.count - a.count)
                      .map((r) => ({ label: REPAIR_STATUS[r.status].label, value: r.count, display: formatNumber(r.count) }))}
                  />
                ) : (
                  <ListSkeleton rows={5} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Délai moyen de réparation" value={d && `${d.avgTurnaroundHours} h`} icon={ClockIcon} loading={!d} />
            <StatCard label="Devis acceptés" value={d && `${Math.round(d.quoteAcceptanceRate * 100)} %`} icon={ThumbsUpIcon} tone="success" loading={!d} />
            <StatCard label="Valeur du stock" value={d && formatCompactXOF(d.stockValue)} icon={BoxesIcon} loading={!d} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <RankTable
              title="Techniciens"
              icon={WrenchIcon}
              head={["Technicien", "Réparations", "Délai moyen"]}
              rows={d?.technicians.map((t) => [t.name, formatNumber(t.completed), `${t.avgTurnaroundHours} h`])}
            />
            <RankTable
              title="Prestations les plus vendues"
              icon={BarChart3Icon}
              head={["Prestation", "Nombre", "Montant"]}
              rows={d?.topServices.map((s) => [s.name, formatNumber(s.count), <Money key={s.name} value={s.revenue} />])}
            />
            <RankTable
              title="Articles les plus vendus"
              icon={BoxesIcon}
              head={["Article", "Qté", "Montant"]}
              rows={d?.topProducts.map((p) => [p.name, formatNumber(p.qty), <Money key={p.name} value={p.revenue} />])}
            />
          </div>
        </>
      )}
    </>
  );
}

/** Single-series horizontal bars: one hue, value in text ink, sorted. */
function BarList({ items }: { items: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label} className="group flex flex-col gap-1.5" title={`${i.label} : ${i.display}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="font-medium tabular-nums">{i.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1 transition-[width] duration-500 ease-out-quint" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RankTable({
  title,
  icon: Icon,
  head,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  head: [string, string, string];
  rows?: React.ReactNode[][];
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {!rows ? (
          <div className="px-4">
            <ListSkeleton rows={4} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{head[0]}</TableHead>
                <TableHead className="text-right">{head[1]}</TableHead>
                <TableHead className="pr-4 text-right">{head[2]}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-44 truncate pl-4 font-medium">{r[0]}</TableCell>
                  <TableCell className="text-right tabular-nums">{r[1]}</TableCell>
                  <TableCell className="pr-4 text-right">{r[2]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
