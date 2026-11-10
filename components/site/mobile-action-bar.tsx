import { PhoneIcon } from "lucide-react";
import { waLink } from "@/shared/phone";
import { WhatsAppIcon } from "./whatsapp-icon";

/** Thumb-reach contact actions on phones; hidden from md up. */
export function MobileActionBar({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  return (
    <div className="glass fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`tel:${phone}`}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-primary transition-transform active:scale-[0.97]"
        >
          <PhoneIcon className="size-4" />
          Appeler
        </a>
        <a
          href={waLink(whatsapp, "Bonjour Shalom Service, j'ai besoin d'une réparation.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition-transform active:scale-[0.97]"
        >
          <WhatsAppIcon className="size-5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
