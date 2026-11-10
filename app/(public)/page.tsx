import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClockIcon,
  CpuIcon,
  HandCoinsIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageCheckIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  WrenchIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { QuickTrack } from "@/components/site/quick-track";
import { Section, SectionHeading } from "@/components/site/section";
import { ServiceCard } from "@/components/site/service-card";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { getPublicServices, getPublicSettings } from "@/lib/public-content";
import { formatPhone } from "@/shared/format";
import { waLink } from "@/shared/phone";
import { ROUTES } from "@/shared/site";

export default async function HomePage() {
  const [settings, services] = await Promise.all([getPublicSettings(), getPublicServices()]);

  return (
    <>
      {/* ── Hero */}
      <section className="relative isolate overflow-hidden bg-[#061b38]">
        <Image
          src="/assets/hero/hero-shalom-technician-repair.webp"
          alt="Technicien Shalom Service réparant un smartphone à l'atelier de Sénou"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-[70%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-[#061b38] via-[#061b38]/80 to-[#061b38]/40 md:bg-linear-to-r md:from-[#061b38] md:via-[#061b38]/85 md:to-transparent"
        />
        <div className="container-page flex min-h-[min(44rem,88svh)] flex-col justify-end gap-8 pt-28 pb-16 md:justify-center md:pb-28">
          <div className="flex max-w-xl animate-in flex-col gap-6 duration-700 fade-in slide-in-from-bottom-3">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur">
              <MapPinIcon className="size-3.5 text-brand" />
              Sénou · Bamako
            </p>
            <h1 className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] text-white sm:text-6xl">
              Votre téléphone, <span className="text-brand">réparé avec soin.</span>
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-white/75">
              Écran, batterie, charge ou logiciel : diagnostic rapide, devis clair avant toute intervention, et suivi de
              votre réparation en ligne.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="brand" size="lg" render={<Link href={ROUTES.quote} />} nativeButton={false}>
                Demander un devis
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/15 hover:text-white"
                render={<Link href={ROUTES.tracking} />}
                nativeButton={false}
              >
                Suivre ma réparation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Promises strip */}
      <div className="relative z-10 container-page -mt-10 md:-mt-14">
        <ul className="grid gap-px overflow-hidden rounded-3xl bg-border shadow-[0_30px_60px_-30px] shadow-primary/30 ring-1 ring-foreground/5 sm:grid-cols-3">
          {[
            { icon: HandCoinsIcon, title: "Prix annoncés d'avance", text: "Devis validé par vous avant toute réparation." },
            { icon: ClockIcon, title: "Réparations rapides", text: "La plupart des écrans et batteries en moins de 2 h." },
            { icon: SmartphoneIcon, title: "Suivi en ligne", text: "Votre code de ticket suffit pour voir l'avancement." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 bg-card p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── About */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src="/assets/about/about-technician-bamako-workshop.webp"
                alt="Technicien au travail dans l'atelier"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-card/90 p-4 pr-6 shadow-xl ring-1 ring-foreground/5 backdrop-blur sm:left-auto sm:-right-6">
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheckIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Données respectées</p>
                <p className="text-xs text-muted-foreground">Code de déverrouillage jamais conservé</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-8">
            <SectionHeading
              eyebrow="L'atelier"
              title="Des réparations faites proprement, expliquées simplement."
              description="Chez Shalom Service, chaque appareil est diagnostiqué avant d'être réparé. Vous savez ce qui ne va pas, ce que ça coûte et quand le récupérer, sans surprise."
            />
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                "Diagnostic avant toute intervention",
                "Pièces de qualité, testées",
                "Paiement Orange Money et Moov Money",
                "Smartphones, tablettes et accessoires",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div>
              <Button variant="outline" size="lg" render={<Link href={ROUTES.about} />} nativeButton={false}>
                Découvrir l&apos;atelier
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Services */}
      <Section tone="muted" id="services">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Nos prestations"
              title="Ce que nous réparons"
              description="Les pannes les plus courantes, réparées en atelier avec un prix indicatif. Pour le reste, un diagnostic suffit."
            />
            <Button variant="ghost" className="w-fit" render={<Link href={ROUTES.services} />} nativeButton={false}>
              Toutes les prestations
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Process */}
      <Section>
        <div className="flex flex-col gap-14">
          <SectionHeading
            align="center"
            eyebrow="Comment ça marche"
            title="Quatre étapes, aucune surprise"
            description="Du dépôt à la récupération, vous savez toujours où en est votre appareil."
          />
          <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: PackageCheckIcon, title: "Dépôt", text: "Vous déposez l'appareil et recevez un ticket avec votre code de suivi." },
              { icon: CpuIcon, title: "Diagnostic & devis", text: "Nous identifions la panne et vous envoyons le prix sur WhatsApp." },
              { icon: WrenchIcon, title: "Réparation", text: "Après votre accord, un technicien répare et teste l'appareil." },
              { icon: BadgeCheckIcon, title: "Récupération", text: "Vous êtes prévenu dès que c'est prêt. Vous payez à la remise." },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex flex-col gap-4 rounded-3xl bg-muted p-7">
                <span className="font-mono text-xs font-medium text-muted-foreground">0{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-card text-primary shadow-sm ring-1 ring-foreground/5">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ── Tracking band */}
      <section className="container-page">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-primary-foreground md:px-14 md:py-16">
          <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-brand/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-80 rounded-full bg-[#2a5a9c]/40 blur-3xl" />
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="flex max-w-lg flex-col gap-3">
              <p className="eyebrow">Suivi de réparation</p>
              <h2 className="text-3xl font-semibold tracking-[-0.025em] md:text-4xl">Où en est votre téléphone ?</h2>
              <p className="text-white/70">
                Entrez le code imprimé sur votre ticket. Vous confirmerez ensuite avec votre numéro de téléphone.
              </p>
            </div>
            <QuickTrack />
          </div>
        </div>
      </section>

      {/* ── Why us */}
      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Pourquoi nous choisir"
            title="La confiance se gagne à chaque réparation."
            description="Un atelier de quartier avec des méthodes d'atelier professionnel."
          />
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {[
              { icon: ClipboardCheckIcon, title: "Devis avant réparation", text: "Rien n'est réparé sans votre accord. Le prix annoncé est le prix payé." },
              { icon: ShieldCheckIcon, title: "Appareil entre de bonnes mains", text: "Ticket numéroté, état de l'appareil noté au dépôt, historique conservé." },
              { icon: WrenchIcon, title: "Techniciens expérimentés", text: "iPhone, Samsung, Tecno, Infinix, Itel, Xiaomi : nous connaissons vos appareils." },
              { icon: MessageCircleIcon, title: "Toujours joignable", text: "Une question ? Écrivez-nous sur WhatsApp, nous répondons vite." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col gap-3">
                <Icon className="size-6 text-brand" />
                <h3 className="text-base font-semibold tracking-normal">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Accessories */}
      <Section tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            <SectionHeading
              eyebrow="Boutique"
              title="Accessoires et téléphones, sur place."
              description="Coques, verres trempés, chargeurs rapides, câbles, écouteurs, batteries externes et smartphones neufs. Posé gratuitement pour les protections d'écran achetées chez nous."
            />
            <div>
              <Button variant="default" size="lg" render={<Link href={ROUTES.contact} />} nativeButton={false}>
                Nous rendre visite
                <MapPinIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <div className="relative order-1 aspect-[4/3] overflow-hidden rounded-[2rem] bg-card lg:order-2">
            <Image
              src="/assets/services/service-mobile-accessories.webp"
              alt="Accessoires de téléphone en rayon"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>

      {/* ── Contact CTA */}
      <Section>
        <div className="flex flex-col items-center gap-8 text-center">
          <SectionHeading
            align="center"
            eyebrow="Besoin d'aide ?"
            title="Parlez-nous de votre panne."
            description={`Ouvert ${settings.hours.map((h) => `${h.days.toLowerCase()} ${h.open}–${h.close}`).join(", ")}.`}
          />
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              className="bg-[#25D366] text-white hover:bg-[#1fbe5b]"
              render={<a href={waLink(settings.whatsapp, "Bonjour Shalom Service, j'ai besoin d'une réparation.")} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              <WhatsAppIcon className="size-5" />
              Écrire sur WhatsApp
            </Button>
            <Button size="lg" variant="outline" render={<a href={`tel:${settings.phones[0]}`} />} nativeButton={false}>
              <PhoneIcon data-icon="inline-start" />
              {formatPhone(settings.phones[0]!)}
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
