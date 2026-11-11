import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffSession } from "@/server/auth/session";
import { ROUTES } from "@/shared/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#061b38] lg:block">
        <Image src="/assets/hero/hero-technician-alternative.webp" alt="" fill priority sizes="55vw" className="object-cover opacity-70" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-[#061b38] via-[#061b38]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-12 text-white">
          <p className="eyebrow">Espace équipe</p>
          <p className="max-w-md text-3xl leading-tight font-semibold tracking-[-0.025em]">
            Réparations, stock et caisse, au même endroit.
          </p>
        </div>
      </div>
      <div className="flex flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Logo size="md" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.025em]">Connexion</h1>
            <p className="text-muted-foreground">Accès réservé au personnel de Shalom Service.</p>
          </div>
          <Suspense fallback={<FormSkeleton />}>
            <RedirectIfSignedIn />
            <LoginForm />
          </Suspense>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Identifiant oublié ou compte bloqué ? Demandez à l&apos;administrateur de réinitialiser votre accès.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Already signed in (valid session): go straight to the back office. */
async function RedirectIfSignedIn() {
  if (await getStaffSession()) redirect(ROUTES.dashboard);
  return null;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
