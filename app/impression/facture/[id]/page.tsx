"use client";

import { useParams } from "next/navigation";
import { LinesTableA4, PrintFrame, ShopHeaderA4, TotalRow } from "@/components/print/print-kit";
import { useRepair, useSettings } from "@/client/hooks";
import { PAYMENT_METHOD } from "@/shared/domain/labels";
import { balanceDue, linesTotal, paidTotal } from "@/shared/domain/money";
import { formatDate, formatDateTime, formatPhone, formatXOF } from "@/shared/format";

/** A4 invoice for a repair. The sequential invoice number comes from the server once integrated. */
export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const repair = useRepair(id);
  const settings = useSettings();
  const r = repair.data;
  const s = settings.data;
  return (
    <PrintFrame format="a4" ready={!!r && !!s}>
      {r && s && (
        <div className="flex flex-col gap-8">
          <ShopHeaderA4 settings={s} title="Facture" number={r.invoiceNumber ?? `Proforma ${r.code}`} date={formatDate(r.updatedAt)} />
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Facturé à</p>
              <p className="font-medium">{r.customer.name}</p>
              <p>{formatPhone(r.customer.phone)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Réparation</p>
              <p className="font-medium">
                {r.device.brand} {r.device.model} · ticket {r.code}
              </p>
              {r.device.imei && <p>IMEI {r.device.imei}</p>}
            </div>
          </div>
          <LinesTableA4 lines={r.lines} />
          <div className="ml-auto flex w-72 flex-col gap-1.5">
            <TotalRow label="Total TTC" value={linesTotal(r.lines)} />
            <TotalRow label="Payé" value={paidTotal(r.payments)} />
            <TotalRow label="Reste à payer" value={balanceDue(r.lines, r.payments)} strong />
            <p className="text-right text-xs text-neutral-500">TVA non applicable</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-neutral-500 uppercase">Règlements</p>
            {r.payments
              .filter((p) => !p.voided)
              .map((p) => (
                <p key={p.id} className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span>
                    {formatDateTime(p.at)} · {p.kind === "deposit" ? "Acompte" : "Paiement"} · {PAYMENT_METHOD[p.method]}
                  </span>
                  <span className="tabular-nums">{formatXOF(p.amount)}</span>
                </p>
              ))}
          </div>
          <p className="text-center text-xs text-neutral-500">Merci pour votre confiance. Shalom Service, {s.city}.</p>
        </div>
      )}
    </PrintFrame>
  );
}
