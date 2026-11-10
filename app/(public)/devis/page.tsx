import { BadgeCheckIcon, MessageCircleIcon, TimerIcon } from "lucide-react";
import type { Metadata } from "next";
import { InquiryForm } from "@/components/site/inquiry-form";
import { PageHero, Section } from "@/components/site/section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Demander un devis",
  description: "Décrivez la panne de votre téléphone et recevez un devis de Shalom Service.",
};

export default function QuotePage() {
  return (
    <>
      <PageHero
        eyebrow="Devis gratuit"
        title="Décrivez la panne, on vous donne le prix."
        description="Réponse rapide par téléphone ou WhatsApp. Aucun engagement : vous décidez après avoir reçu le devis."
      />
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Card className="rounded-[2rem] p-2">
            <CardContent className="p-5 md:p-8">
              <InquiryForm defaultType="quote" />
            </CardContent>
          </Card>
          <aside className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Et ensuite ?</h2>
            <ol className="flex flex-col gap-6">
              {[
                { icon: MessageCircleIcon, title: "Nous vous contactons", text: "Pour préciser le modèle et la panne si besoin." },
                { icon: BadgeCheckIcon, title: "Vous recevez le prix", text: "Un prix indicatif, confirmé après diagnostic à l'atelier." },
                { icon: TimerIcon, title: "Vous déposez l'appareil", text: "La plupart des réparations sont faites le jour même." },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </Section>
    </>
  );
}
