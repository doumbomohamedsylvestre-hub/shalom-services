import { ArrowRightIcon, EyeIcon, HeartHandshakeIcon, ScaleIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/shared/site";

export const metadata: Metadata = {
  title: "À propos",
  description: "Shalom Service, atelier de réparation de téléphones à Sénou, Bamako.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="À propos"
        title="Un atelier de quartier, des standards de professionnel."
        description="Shalom Service répare, entretient et équipe les téléphones des habitants de Sénou et de tout Bamako."
      />
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-muted">
            <Image
              src="/assets/about/about-shalom-storefront-concept.webp"
              alt="Boutique Shalom Service"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-6 text-lg leading-relaxed text-muted-foreground">
            <SectionHeading eyebrow="Notre histoire" title="Réparer plutôt que remplacer." />
            <p>
              Un téléphone, c&apos;est le travail, la famille, l&apos;argent mobile. Quand il tombe en panne, tout
              s&apos;arrête. Nous avons créé Shalom Service pour que la réparation soit rapide, honnête et sans mauvaise
              surprise.
            </p>
            <p>
              Chaque appareil reçoit un ticket numéroté, son état est noté au dépôt et vous suivez la réparation en
              ligne. Le prix est validé avec vous avant l&apos;intervention.
            </p>
          </div>
        </div>
      </Section>
      <Section tone="muted">
        <div className="flex flex-col gap-14">
          <SectionHeading align="center" eyebrow="Nos engagements" title="Ce qui guide notre travail" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ScaleIcon, title: "Honnêteté", text: "Un diagnostic clair et un prix annoncé avant toute réparation." },
              { icon: SparklesIcon, title: "Qualité", text: "Des pièces sélectionnées et un test complet avant la remise." },
              { icon: EyeIcon, title: "Transparence", text: "Le suivi en ligne vous montre chaque étape de la réparation." },
              { icon: HeartHandshakeIcon, title: "Respect", text: "Vos données restent les vôtres. Le code n'est jamais conservé." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col gap-4 rounded-3xl bg-card p-7 ring-1 ring-foreground/5">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="L'atelier"
              title="Un poste de travail pensé pour la précision."
              description="Loupe éclairée, outillage spécialisé et tapis antistatique : les réparations délicates se font dans de bonnes conditions."
            />
            <div>
              <Button variant="brand" size="lg" render={<Link href={ROUTES.quote} />} nativeButton={false}>
                Demander un devis
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-[2rem] bg-muted">
              <Image src="/assets/about/about-repair-workshop-technician.webp" alt="Technicien à l'atelier" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-muted">
              <Image src="/assets/services/service-precision-repair.webp" alt="Réparation de précision" fill sizes="280px" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-muted">
              <Image src="/assets/gallery/service-photo-collage.webp" alt="Réparations réalisées" fill sizes="280px" className="object-cover" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
