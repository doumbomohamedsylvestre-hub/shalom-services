"use client";

import { useParams } from "next/navigation";
import { Dashed, PrintFrame, ThermalHeader, useSiteHost } from "@/components/print/print-kit";
import { useRepair, useSettings } from "@/client/hooks";
import { PAYMENT_METHOD, REPAIR_MODE } from "@/shared/domain/labels";
import { linesTotal } from "@/shared/domain/money";
import { formatDateTime, formatPhone, formatXOF } from "@/shared/format";
import { SITE } from "@/shared/site";

/** 80 mm intake ticket handed to the customer at drop-off. */
export default function TicketPrint() {
  const { id } = useParams<{ id: string }>();
  const repair = useRepair(id);
  const settings = useSettings();
  const r = repair.data;
  const s = settings.data;
  const host = useSiteHost(SITE.url);
  return (
    <PrintFrame format="thermal" ready={!!r && !!s}>
      {r && s && (
        <div className="flex flex-col gap-1">
          <ThermalHeader settings={s} />
          <p className="mt-1 text-center">TICKET DE DÉPÔT</p>
          <p className="text-center text-2xl font-bold tracking-wider">{r.code}</p>
          <p className="text-center">{formatDateTime(r.createdAt)}</p>
          <Dashed />
          <p>
            Client : {r.customer.name}
            <br />
            Tél : {formatPhone(r.customer.phone)}
          </p>
          <Dashed />
          <p>
            Appareil : {r.device.brand} {r.device.model}
            {r.device.color && ` (${r.device.color})`}
          </p>
          {r.device.imei && <p>IMEI : {r.device.imei}</p>}
          <p>Panne : {r.fault}</p>
          {r.conditionNotes && <p>État : {r.conditionNotes}</p>}
          {r.accessories && <p>Laissé avec : {r.accessories}</p>}
          <p>Prise en charge : {REPAIR_MODE[r.mode].label}</p>
          {r.lines.length > 0 && <p>Montant convenu : {formatXOF(linesTotal(r.lines))}</p>}
          {r.payments
            .filter((p) => !p.voided)
            .map((p) => (
              <p key={p.id}>
                {p.kind === "deposit" ? "Acompte" : "Paiement"} : {formatXOF(p.amount)} ({PAYMENT_METHOD[p.method]})
              </p>
            ))}
          {r.estimatedReadyAt && <p>Prêt estimé : {formatDateTime(r.estimatedReadyAt)}</p>}
          <Dashed />
          <p className="text-center">Suivez votre réparation :</p>
          <p className="text-center font-bold break-all">{host}/suivi</p>
          <p className="text-center">avec ce code et votre numéro.</p>
          <Dashed />
          <p className="text-[9px] leading-tight">{s.terms}</p>
          <p className="mt-2 text-center">Merci de votre confiance !</p>
        </div>
      )}
    </PrintFrame>
  );
}
