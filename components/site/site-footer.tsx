import { ClockIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";
import { formatPhone } from "@/shared/format";
import type { Service, ShopSettings } from "@/shared/domain/types";
import { ROUTES } from "@/shared/site";
import { CurrentYear } from "./current-year";
import { PUBLIC_NAV } from "./nav-links";

export function SiteFooter({ settings, services }: { settings: ShopSettings; services: Service[] }) {
  return (
    <footer className="bg-[#061b38] text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-5">
          <Logo tone="inverse" showTagline size="lg" />
          <p className="max-w-xs text-sm leading-relaxed text-white/65">
            Atelier de réparation de smartphones et tablettes à Sénou. Diagnostic honnête, pièces de qualité et suivi de
            votre réparation en ligne.
          </p>
        </div>

        <FooterColumn title="Prestations">
          {services.slice(0, 5).map((s) => (
            <FooterLink key={s.id} href={`${ROUTES.services}#${s.slug}`}>
              {s.name}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title="Navigation">
          {PUBLIC_NAV.slice(1).map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
          <FooterLink href={ROUTES.quote}>Demander un devis</FooterLink>
        </FooterColumn>

        <FooterColumn title="Nous trouver">
          <p className="flex gap-3 text-sm text-white/75">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              {settings.address}
              <br />
              {settings.city}
            </span>
          </p>
          {settings.phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="flex items-center gap-3 text-sm text-white/75 transition-colors hover:text-white">
              <PhoneIcon className="size-4 shrink-0 text-brand" />
              {formatPhone(p)}
            </a>
          ))}
          <div className="flex gap-3 text-sm text-white/75">
            <ClockIcon className="mt-0.5 size-4 shrink-0 text-brand" />
            <ul className="flex flex-col gap-1">
              {settings.hours.map((h) => (
                <li key={h.days}>
                  {h.days} : {h.open} – {h.close}
                </li>
              ))}
            </ul>
          </div>
        </FooterColumn>
      </div>
      <Separator className="bg-white/10" />
      <div className="container-page flex flex-col gap-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © <CurrentYear /> Shalom Service. Tous droits réservés.
        </p>
        <Link href={ROUTES.login} className="transition-colors hover:text-white">
          Espace équipe
        </Link>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-normal text-white">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="w-fit text-sm text-white/65 transition-colors hover:text-white">
      {children}
    </Link>
  );
}
