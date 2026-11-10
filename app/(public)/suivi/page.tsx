import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero, Section } from "@/components/site/section";
import { Tracking } from "@/components/site/tracking";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Suivi de réparation",
  description: "Suivez l'avancement de la réparation de votre téléphone avec votre code de ticket.",
};

export default function TrackingPage() {
  return (
    <>
      <PageHero
        eyebrow="Suivi"
        title="Où en est votre réparation ?"
        description="Entrez le code de votre ticket et le numéro de téléphone donné au dépôt."
      />
      <Section className="pt-12 md:pt-16">
        <Suspense fallback={<Skeleton className="mx-auto h-80 w-full max-w-lg rounded-3xl" />}>
          <Tracking />
        </Suspense>
      </Section>
    </>
  );
}
