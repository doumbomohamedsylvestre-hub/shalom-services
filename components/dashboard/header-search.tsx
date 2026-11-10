"use client";

import { PlusIcon, SearchIcon, ShoppingBagIcon, UserPlusIcon, WrenchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { RepairStatusBadge } from "@/components/status-badge";
import { useRepairs } from "@/client/hooks";
import { useSession } from "@/client/session";
import { formatPhone } from "@/shared/format";

const D = "/tableau-de-bord";

/** ⌘K palette: jump to a repair by code, customer or phone, or start a task. */
export function HeaderSearch() {
  const router = useRouter();
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  const repairs = useRepairs({ status: "all" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 flex-1 justify-start gap-2 rounded-full bg-muted/60 px-4 font-normal text-muted-foreground sm:max-w-sm md:h-9"
      >
        <SearchIcon />
        <span className="truncate">Rechercher un ticket, un client…</span>
        <Kbd className="ml-auto hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Recherche" description="Rechercher un ticket ou lancer une action" className="sm:max-w-xl">
        <Command>
          <CommandInput placeholder="Code, nom ou téléphone…" />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup heading="Actions rapides">
              {can({ repair: ["create"] }) && (
                <CommandItem onSelect={() => go(`${D}/reparations/nouvelle`)}>
                  <PlusIcon />
                  Nouvelle réparation
                </CommandItem>
              )}
              {can({ sale: ["create"] }) && (
                <CommandItem onSelect={() => go(`${D}/ventes/nouvelle`)}>
                  <ShoppingBagIcon />
                  Nouvelle vente
                </CommandItem>
              )}
              {can({ customer: ["create"] }) && (
                <CommandItem onSelect={() => go(`${D}/clients`)}>
                  <UserPlusIcon />
                  Clients
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Réparations">
              {(repairs.data ?? []).slice(0, 60).map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.code} ${r.customer.name} ${r.customer.phone} ${r.device.brand} ${r.device.model}`}
                  onSelect={() => go(`${D}/reparations/${r.id}`)}
                >
                  <WrenchIcon className="shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {r.customer.name}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {r.device.brand} {r.device.model}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
                      <span className="font-mono">{r.code}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate tabular-nums">{formatPhone(r.customer.phone)}</span>
                    </span>
                  </div>
                  <RepairStatusBadge status={r.status} className="ml-2 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
