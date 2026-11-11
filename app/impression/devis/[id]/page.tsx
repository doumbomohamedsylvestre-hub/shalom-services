"use client";

import { useParams } from "next/navigation";
import { LinesTableA4, PrintFrame, ShopHeaderA4, TotalRow, TaxNote } from "@/components/print/print-kit";
import { useRepair, useSettings } from "@/client/hooks";
import { linesTotal } from "@/shared/domain/money";
import { formatDate, formatPhone } from "@/shared/format";

/** A4 quote for a repair (diagnose → quote → approve flow). */
export default function QuotePrint() {
  const { id } = useParams<{ id: string }>();
  const repair = useRepair(id);
  const settings = useSettings();
  const r = repair.data;
  const s = settings.data;
  return (
    <PrintFrame format="a4" ready={!!r && !!s}>
      {r && s && (
        <div className="flex flex-col gap-8">
          <ShopHeaderA4 settings={s} title="Devis" number={r.code} date={formatDate(r.updatedAt)} />
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Client</p>
              <p className="font-medium">{r.customer.name}</p>
              <p>{formatPhone(r.customer.phone)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase">Appareil</p>
              <p className="font-medium">
                {r.device.brand} {r.device.model}
              </p>
              <p>{r.fault}</p>
            </div>
          </div>
          {r.diagnosis && (
            <div className="rounded-lg bg-neutral-100 p-4">
              <p className="text-xs text-neutral-500 uppercase">Diagnostic</p>
              <p>{r.diagnosis}</p>
            </div>
          )}
          <LinesTableA4 lines={r.lines} />
          <div className="ml-auto flex w-72 flex-col gap-1.5">
            <TotalRow label="Total TTC" value={linesTotal(r.lines)} strong />
            <TaxNote total={linesTotal(r.lines)} rate={s.taxRate} />
          </div>
          <p className="text-xs text-neutral-600">
            Devis valable 15 jours. La réparation démarre après votre accord. Le solde est réglé à la récupération de l&apos;appareil.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-neutral-600">
            <div className="h-20 border-t border-neutral-300 pt-2">Bon pour accord, date et signature du client</div>
            <div className="h-20 border-t border-neutral-300 pt-2">Shalom Service</div>
          </div>
        </div>
      )}
    </PrintFrame>
  );
}
