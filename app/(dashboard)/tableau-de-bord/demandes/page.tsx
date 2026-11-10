"use client";

import { ArrowRightIcon, CheckIcon, InboxIcon, PhoneIcon, WrenchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { InquiryStatusBadge } from "@/components/status-badge";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConvertInquiry, useInquiries, useSetInquiryStatus } from "@/client/hooks";
import { useSession } from "@/client/session";
import { cn } from "@/lib/utils";
import { INQUIRY_TYPE } from "@/shared/domain/labels";
import type { InquiryStatus } from "@/shared/domain/types";
import { formatDateTime, formatPhone } from "@/shared/format";
import { waLink } from "@/shared/phone";

export default function InquiriesPage() {
  const router = useRouter();
  const { can } = useSession();
  const [tab, setTab] = useState<"open" | InquiryStatus | "all">("open");
  const inquiries = useInquiries();
  const setStatus = useSetInquiryStatus();
  const convert = useConvertInquiry();

  const items = (inquiries.data ?? []).filter((i) =>
    tab === "all" ? true : tab === "open" ? i.status === "new" || i.status === "contacted" : i.status === tab,
  );

  return (
    <>
      <PageHeader title="Demandes" description="Messages, demandes de devis et de réparation envoyés depuis le site." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="scroll-x-hidden -mx-4 min-w-0 px-4 md:mx-0 md:px-0">
        <TabsList className="w-max">
          <TabsTrigger value="open">À traiter</TabsTrigger>
          <TabsTrigger value="converted">Converties</TabsTrigger>
          <TabsTrigger value="closed">Clôturées</TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>
      </Tabs>
      {inquiries.isLoading ? (
        <ListSkeleton />
      ) : inquiries.isError ? (
        <ErrorState onRetry={() => inquiries.refetch()} />
      ) : !items.length ? (
        <EmptyState icon={InboxIcon} title="Rien à traiter" description="Les nouvelles demandes du site arrivent ici." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((i) => (
            <Card key={i.id} className={cn("rounded-2xl", i.status === "new" && "ring-brand/40")}>
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {INQUIRY_TYPE[i.type]} · {formatDateTime(i.createdAt)}
                    </p>
                  </div>
                  <InquiryStatusBadge status={i.status} />
                </div>
                {i.device && (
                  <p className="w-fit rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">{i.device}</p>
                )}
                <p className="text-sm leading-relaxed">{i.message}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-4">
                  <Button size="sm" variant="outline" render={<a href={`tel:${i.phone}`} />} nativeButton={false}>
                    <PhoneIcon data-icon="inline-start" />
                    {formatPhone(i.phone)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={waLink(i.phone, `Bonjour ${i.name.split(" ")[0]}, Shalom Service suite à votre demande :`)} target="_blank" rel="noopener noreferrer" />}
                    nativeButton={false}
                    onClick={() => i.status === "new" && setStatus.mutate({ id: i.id, status: "contacted" })}
                  >
                    <WhatsAppIcon className="size-4 text-[#25D366]" />
                    Répondre
                  </Button>
                  <div className="ml-auto flex gap-1">
                    {i.status === "new" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: i.id, status: "contacted" })}>
                        <CheckIcon data-icon="inline-start" />
                        Contacté
                      </Button>
                    )}
                    {(i.status === "new" || i.status === "contacted") && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: i.id, status: "closed" })} aria-label="Clôturer">
                          <XIcon />
                        </Button>
                        {can({ inquiry: ["convert"] }) && i.type !== "contact" && (
                          <Button
                            size="sm"
                            disabled={convert.isPending}
                            onClick={() => convert.mutate(i.id, { onSuccess: (r) => router.push(`/tableau-de-bord/reparations/${r.id}?nouveau=1`) })}
                          >
                            <WrenchIcon data-icon="inline-start" />
                            Créer le ticket
                          </Button>
                        )}
                      </>
                    )}
                    {i.convertedRepairCode && (
                      <Button size="sm" variant="ghost" render={<Link href="/tableau-de-bord/reparations?vue=toutes" />} nativeButton={false}>
                        {i.convertedRepairCode}
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
