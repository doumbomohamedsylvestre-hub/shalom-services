"use client";

import { PlusIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { CustomerDialog } from "@/components/dashboard/customer-dialog";
import { EmptyState, ErrorState, ListSkeleton, Money, SearchInput } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomers } from "@/client/hooks";
import { useSession } from "@/client/session";
import { formatDate, formatPhone, initials } from "@/shared/format";

export default function CustomersPage() {
  const router = useRouter();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const customers = useCustomers(useDeferredValue(q));
  return (
    <>
      <PageHeader
        title="Clients"
        description="Un client par numéro de téléphone."
        actions={
          can({ customer: ["create"] }) && (
            <Button onClick={() => setOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Nouveau client
            </Button>
          )
        }
      />
      <SearchInput value={q} onChange={setQ} placeholder="Nom ou téléphone…" />
      {customers.isLoading ? (
        <ListSkeleton />
      ) : customers.isError ? (
        <ErrorState onRetry={() => customers.refetch()} />
      ) : !customers.data?.length ? (
        <EmptyState icon={UsersIcon} title="Aucun client trouvé" description="Les clients sont créés au dépôt d'un appareil ou ici." />
      ) : (
        <Card className="rounded-2xl py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Client</TableHead>
                <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                <TableHead className="text-right">Réparations</TableHead>
                <TableHead className="hidden text-right md:table-cell">Total payé</TableHead>
                <TableHead className="hidden pr-5 text-right lg:table-cell">Client depuis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.data.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/tableau-de-bord/clients/${c.id}`)}>
                  <TableCell className="pl-5">
                    <Link href={`/tableau-de-bord/clients/${c.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/8 text-xs text-primary">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{formatPhone(c.phone)}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{formatPhone(c.phone)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.repairsCount}</TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    <Money value={c.totalSpent} />
                  </TableCell>
                  <TableCell className="hidden pr-5 text-right text-muted-foreground lg:table-cell">{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <CustomerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
