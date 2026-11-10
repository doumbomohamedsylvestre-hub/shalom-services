import { ClockIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/site/inquiry-form";
import { PageHero, Section } from "@/components/site/section";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicSettings } from "@/lib/public-content";
import { formatPhone } from "@/shared/format";
import { waLink } from "@/shared/phone";

export const metadata: Metadata = {
  title: "Contact",
  description: "Adresse, horaires, téléphone et WhatsApp de Shalom Service à Sénou, Bamako.",
};

export default async function ContactPage() {
  const settings = await getPublicSettings();
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Passez à l'atelier ou écrivez-nous."
        description="Une question sur une panne, un prix ou un accessoire ? Nous répondons rapidement."
      />
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div className="flex flex-col gap-4">
            <ContactItem icon={MapPinIcon} title="Adresse">
              {settings.address}
              <br />
              {settings.city}
              {settings.mapUrl && (
                <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block font-medium text-primary hover:underline">
                  Ouvrir dans Google Maps
                </a>
              )}
            </ContactItem>
            <ContactItem icon={PhoneIcon} title="Téléphone">
              {settings.phones.map((p) => (
                <a key={p} href={`tel:${p}`} className="block font-medium text-foreground hover:text-primary">
                  {formatPhone(p)}
                </a>
              ))}
            </ContactItem>
            <ContactItem icon={WhatsAppIcon} title="WhatsApp">
              <a href={waLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary">
                {formatPhone(settings.whatsapp)}
              </a>
            </ContactItem>
            <ContactItem icon={ClockIcon} title="Horaires">
              <ul className="flex flex-col gap-1">
                {settings.hours.map((h) => (
                  <li key={h.days} className="flex justify-between gap-6">
                    <span>{h.days}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {h.open} – {h.close}
                    </span>
                  </li>
                ))}
              </ul>
            </ContactItem>
            {settings.mapEmbedUrl && (
              <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-muted ring-1 ring-foreground/5">
                <iframe
                  title="Carte : Shalom Service à Sénou"
                  src={settings.mapEmbedUrl}
                  className="size-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
          <Card className="rounded-[2rem] p-2">
            <CardContent className="flex flex-col gap-6 p-5 md:p-8">
              <div>
                <h2 className="text-2xl font-semibold">Envoyer un message</h2>
                <p className="mt-1 text-muted-foreground">Nous revenons vers vous par téléphone ou WhatsApp.</p>
              </div>
              <InquiryForm defaultType="contact" />
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}

function ContactItem({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-3xl bg-muted p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-brand shadow-sm">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}
