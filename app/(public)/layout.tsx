import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getPublicServices, getPublicSettings } from "@/lib/public-content";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, services] = await Promise.all([getPublicSettings(), getPublicServices()]);
  return (
    <>
      <SiteHeader phone={settings.phones[0]!} />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <SiteFooter settings={settings} services={services} />
      <MobileActionBar phone={settings.phones[0]!} whatsapp={settings.whatsapp} />
    </>
  );
}
