"use client";

import { ArrowRightIcon, MenuIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/shared/format";
import { ROUTES } from "@/shared/site";
import { PUBLIC_NAV } from "./nav-links";

export function SiteHeader({ phone }: { phone: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300",
        scrolled ? "glass shadow-[0_1px_0_0] shadow-border" : "bg-background",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <Logo size="md" />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                "aria-[current=page]:bg-secondary aria-[current=page]:text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" className="hidden xl:inline-flex" render={<a href={`tel:${phone}`} />} nativeButton={false}>
            <PhoneIcon data-icon="inline-start" />
            {formatPhone(phone)}
          </Button>
          <Button variant="brand" render={<Link href={ROUTES.quote} />} nativeButton={false}>
            Demander un devis
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu" />}
          >
            <MenuIcon className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,100vw)] gap-0 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle render={<div />}>
                <Logo size="sm" href={null} />
              </SheetTitle>
              <SheetDescription className="sr-only">Menu de navigation</SheetDescription>
            </SheetHeader>
            <nav aria-label="Menu mobile" className="flex flex-col p-3">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-medium transition-colors active:bg-secondary aria-[current=page]:text-primary aria-[current=page]:bg-secondary"
                >
                  {item.label}
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>
            <Separator />
            <div className="mt-auto flex flex-col gap-2 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <Button variant="brand" size="lg" render={<Link href={ROUTES.quote} onClick={() => setOpen(false)} />} nativeButton={false}>
                Demander un devis
              </Button>
              <Button variant="outline" size="lg" render={<a href={`tel:${phone}`} />} nativeButton={false}>
                <PhoneIcon data-icon="inline-start" />
                Appeler {formatPhone(phone)}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
