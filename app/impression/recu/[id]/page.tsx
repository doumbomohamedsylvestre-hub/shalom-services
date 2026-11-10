"use client";

import { useParams } from "next/navigation";
import { Dashed, PrintFrame, ThermalHeader } from "@/components/print/print-kit";
import { useSale, useSettings } from "@/client/hooks";
import { PAYMENT_METHOD } from "@/shared/domain/labels";
import { lineTotal, linesTotal } from "@/shared/domain/money";
import { formatDateTime, formatXOF } from "@/shared/format";

/** 80 mm counter sale receipt. */
export default function ReceiptPrint() {
  const { id } = useParams<{ id: string }>();
  const sale = useSale(id);
  const settings = useSettings();
  const v = sale.data;
  const s = settings.data;
  return (
    <PrintFrame format="thermal" ready={!!v && !!s}>
      {v && s && (
        <div className="flex flex-col gap-1">
          <ThermalHeader settings={s} />
          <p className="mt-1 text-center">REÇU DE VENTE {v.number}</p>
          <p className="text-center">{formatDateTime(v.at)}</p>
          {v.voided && <p className="text-center font-bold">*** VENTE ANNULÉE ***</p>}
          <Dashed />
          {v.lines.map((l) => (
            <div key={l.id}>
              <p>{l.label}</p>
              <p className="flex justify-between">
                <span>
                  {l.qty} × {formatXOF(l.unitPrice)}
                  {l.discount > 0 && ` −${formatXOF(l.discount)}`}
                </span>
                <span>{formatXOF(lineTotal(l))}</span>
              </p>
            </div>
          ))}
          <Dashed />
          <p className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatXOF(linesTotal(v.lines))}</span>
          </p>
          {v.payments.map((p) => (
            <p key={p.id} className="flex justify-between">
              <span>{PAYMENT_METHOD[p.method]}</span>
              <span>{formatXOF(p.amount)}</span>
            </p>
          ))}
          <Dashed />
          <p>Vendeur : {v.soldBy}</p>
          {v.customer && <p>Client : {v.customer.name}</p>}
          <p className="mt-2 text-center">Merci et à bientôt !</p>
        </div>
      )}
    </PrintFrame>
  );
}
