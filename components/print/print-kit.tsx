"use client";

import { PrinterIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LineItem, ShopSettings } from "@/shared/domain/types";
import { lineTotal } from "@/shared/domain/money";
import { formatPhone, formatXOF } from "@/shared/format";

/** On-screen toolbar + @page size; opens the print dialog once data is ready. */
export function PrintFrame({
  format,
  ready,
  autoPrint = true,
  children,
}: {
  format: "thermal" | "a4";
  ready: boolean;
  autoPrint?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!ready || !autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [ready, autoPrint]);

  return (
    <>
      <style>{format === "thermal" ? "@page { size: 80mm auto; margin: 0; }" : "@page { size: A4; margin: 14mm; }"}</style>
      <div className="no-print mx-auto mb-6 flex w-fit items-center gap-2 rounded-full bg-card p-1.5 shadow-sm ring-1 ring-foreground/5">
        <Button size="sm" className="rounded-full" onClick={() => window.print()} disabled={!ready}>
          <PrinterIcon data-icon="inline-start" />
          Imprimer
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => window.close()}>
          <XIcon data-icon="inline-start" />
          Fermer
        </Button>
      </div>
      <div
        className={cn(
          "mx-auto bg-white text-black shadow-xl print:shadow-none",
          format === "thermal"
            ? "w-[80mm] px-[4mm] py-[5mm] font-mono text-[11px] leading-snug"
            : "min-h-[297mm] w-[210mm] max-w-full p-[14mm] text-[13px] print:min-h-0 print:w-auto print:p-0",
        )}
      >
        {ready ? children : <Skeleton className="h-96 w-full" />}
      </div>
    </>
  );
}

export function ShopHeaderA4({ settings, title, number, date }: { settings: ShopSettings; title: string; number: string; date: string }) {
  return (
    <header className="flex items-start justify-between gap-8 border-b-2 border-[#07274d] pb-6">
      <div className="flex items-center gap-3">
        <Image src="/branding/shalom-service-logo-icon.png" alt="" width={56} height={56} />
        <div>
          <p className="text-xl font-extrabold tracking-tight">
            <span className="text-[#07274d]">Shalom</span> <span className="text-[#ff7900]">Service</span>
          </p>
          <p className="text-xs text-neutral-600">
            {settings.address}, {settings.city}
            <br />
            {settings.phones.map(formatPhone).join(" · ")}
            {settings.email && <> · {settings.email}</>}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold tracking-tight text-[#07274d]">{title}</p>
        <p className="font-mono text-sm">{number}</p>
        <p className="text-xs text-neutral-600">{date}</p>
      </div>
    </header>
  );
}

export function LinesTableA4({ lines }: { lines: LineItem[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-neutral-300 text-xs text-neutral-600 uppercase">
          <th className="py-2 font-medium">Désignation</th>
          <th className="py-2 text-right font-medium">Qté</th>
          <th className="py-2 text-right font-medium">Prix unitaire</th>
          <th className="py-2 text-right font-medium">Remise</th>
          <th className="py-2 text-right font-medium">Montant</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.id} className="border-b border-neutral-200">
            <td className="py-2.5">{l.label}</td>
            <td className="py-2.5 text-right tabular-nums">{l.qty}</td>
            <td className="py-2.5 text-right tabular-nums">{formatXOF(l.unitPrice)}</td>
            <td className="py-2.5 text-right tabular-nums">{l.discount ? `−${formatXOF(l.discount)}` : "—"}</td>
            <td className="py-2.5 text-right font-medium tabular-nums">{formatXOF(lineTotal(l))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TotalRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-6", strong && "border-t border-neutral-300 pt-2 text-base font-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{formatXOF(value)}</span>
    </div>
  );
}

export function ThermalHeader({ settings }: { settings: ShopSettings }) {
  return (
    <div className="flex flex-col items-center gap-1 border-b border-dashed border-black pb-2 text-center">
      <Image src="/icons/monochrome-icon-192x192.png" alt="" width={40} height={40} />
      <p className="text-sm font-bold">SHALOM SERVICE</p>
      <p>
        {settings.address}, {settings.city}
      </p>
      <p>{settings.phones.map(formatPhone).join(" / ")}</p>
    </div>
  );
}

export function Dashed() {
  return <div className="my-2 border-b border-dashed border-black" />;
}

/** Prices are VAT-inclusive (TTC). Shows the VAT share when the rate is set in Paramètres. */
export function TaxNote({ total, rate }: { total: number; rate: number }) {
  if (!rate) return <p className="text-right text-xs text-neutral-500">TVA non applicable</p>;
  const vat = Math.round((total * rate) / (100 + rate));
  return (
    <p className="text-right text-xs text-neutral-500">
      dont TVA {rate} % : {formatXOF(vat)}
    </p>
  );
}

/** The site address the customer should visit, from the host actually serving this page. */
export function useSiteHost(fallback: string) {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.host,
    () => fallback.replace(/^https?:\/\//, ""),
  );
}
const noopSubscribe = () => () => {};
