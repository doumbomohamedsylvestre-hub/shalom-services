import { ArrowRightIcon, ClockIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero, Section, SectionHeading } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { getPublicServices } from "@/lib/public-content";
import { formatXOF } from "@/shared/format";
import { ROUTES } from "@/shared/site";

export const metadata: Metadata = {
  title: "Services de réparation",
  description: "Écran, batterie, connecteur de charge, logiciel et diagnostic pour smartphones et tablettes à Bamako.",
};

export default async function ServicesPage() {
  const services = await getPublicServices();
  return (
    <>
      <PageHero
        eyebrow="Prestations"
        title="Des réparations claires, au juste prix."
        description="Les prix indiqués sont des points de départ. Le prix exact dépend du modèle : il vous est toujours confirmé avant la réparation."
      />
      <Section>
        <div className="flex flex-col gap-20 md:gap-28">
          {services.map((s, i) => (
            <article key={s.id} id={s.slug} className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-muted ${i % 2 ? "lg:order-2" : ""}`}>
                <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
              </div>
              <div className="flex flex-col gap-6">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="text-3xl font-semibold tracking-[-0.025em] md:text-4xl">{s.name}</h2>
                <p className="text-lg leading-relaxed text-muted-foreground">{s.description}</p>
                <dl className="flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-muted px-5 py-3">
                    <dt className="text-xs text-muted-foreground">À partir de</dt>
                    <dd className="text-lg font-semibold text-primary">{s.priceFrom ? formatXOF(s.priceFrom) : "Sur devis"}</dd>
                  </div>
                  <div className="rounded-2xl bg-muted px-5 py-3">
                    <dt className="text-xs text-muted-foreground">Durée</dt>
                    <dd className="flex items-center gap-1.5 text-lg font-semibold">
                      <ClockIcon className="size-4 text-muted-foreground" />
                      {s.durationLabel}
                    </dd>
                  </div>
                </dl>
                <div>
                  <Button variant="brand" size="lg" render={<Link href={`${ROUTES.quote}?service=${s.slug}`} />} nativeButton={false}>
                    Demander un devis
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section tone="muted">
        <div className="flex flex-col items-center gap-6 text-center">
          <SectionHeading
            align="center"
            title="Votre panne n'est pas dans la liste ?"
            description="Apportez l'appareil pour un diagnostic : nous identifions le problème et vous donnons un prix avant de toucher à quoi que ce soit."
          />
          <Button size="lg" render={<Link href={ROUTES.contact} />} nativeButton={false}>
            Nous contacter
          </Button>
        </div>
      </Section>
    </>
  );
}
