"use client";

import { MinusIcon, PackageIcon, PlusIcon, TrashIcon, WrenchIcon } from "lucide-react";
import { useState } from "react";
import { searchFilter } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProducts, useServices } from "@/client/hooks";
import { cn } from "@/lib/utils";
import { lineTotal, linesTotal } from "@/shared/domain/money";
import { formatXOF } from "@/shared/format";
import type { LineInput } from "@/shared/schemas/staff";
import { Money } from "./kit";

/**
 * Editable list of priced lines. Products carry their stock (out-of-stock
 * items can't be added). Discounts are per line; the server records who
 * granted them (SPEC assumption 3).
 */
export function LinesEditor({
  value,
  onChange,
  sources = ["service", "product"],
  productKinds,
  emptyLabel = "Aucune ligne pour le moment.",
  invalid,
}: {
  value: LineInput[];
  onChange: (lines: LineInput[]) => void;
  sources?: ("service" | "product")[];
  productKinds?: ("part" | "accessory" | "phone")[];
  emptyLabel?: string;
  invalid?: boolean;
}) {
  const update = (i: number, patch: Partial<LineInput>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = (line: LineInput) => {
    const existing = line.refId ? value.findIndex((l) => l.refId === line.refId) : -1;
    if (existing >= 0) update(existing, { qty: value[existing]!.qty + 1 });
    else onChange([...value, line]);
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border p-3", invalid && "border-destructive")}>
      {value.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {value.map((l, i) => (
            <li key={`${l.refId ?? "free"}-${i}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 py-3 first:pt-1 md:grid-cols-[1fr_7rem_8.5rem_7.5rem_6.5rem_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  {l.kind === "service" ? <WrenchIcon className="size-3.5" /> : <PackageIcon className="size-3.5" />}
                </span>
                {l.refId ? (
                  <span className="truncate text-sm font-medium">{l.label}</span>
                ) : (
                  <Input value={l.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Libellé" aria-label="Libellé" />
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Retirer la ligne" className="text-muted-foreground md:order-last">
                <TrashIcon />
              </Button>
              <div className="col-span-2 grid grid-cols-3 gap-2 md:col-span-1 md:contents">
                <div className="flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon" className="rounded-r-none" onClick={() => update(i, { qty: Math.max(1, l.qty - 1) })} aria-label="Diminuer">
                    <MinusIcon />
                  </Button>
                  <span className="flex-1 text-center text-sm tabular-nums">{l.qty}</span>
                  <Button variant="ghost" size="icon" className="rounded-l-none" onClick={() => update(i, { qty: l.qty + 1 })} aria-label="Augmenter">
                    <PlusIcon />
                  </Button>
                </div>
                <AmountInput label="Prix unitaire" value={l.unitPrice} onChange={(v) => update(i, { unitPrice: v })} />
                <AmountInput label="Remise" value={l.discount} onChange={(v) => update(i, { discount: v })} placeholder="Remise" />
                <p className="col-span-3 text-right text-sm font-semibold md:col-span-1">
                  <Money value={lineTotal(l)} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <AddLineButton sources={sources} productKinds={productKinds} onAdd={add} />
        {value.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Total <span className="ml-2 text-lg font-semibold text-foreground tabular-nums">{formatXOF(linesTotal(value))}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function AmountInput({ label, value, onChange, placeholder }: { label: string; value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <InputGroup>
      <InputGroupInput
        type="number"
        inputMode="numeric"
        min={0}
        step={500}
        aria-label={label}
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        className="tabular-nums"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText className="text-xs">F</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function AddLineButton({
  sources,
  productKinds,
  onAdd,
  label = "Ajouter",
}: {
  sources: ("service" | "product")[];
  productKinds?: ("part" | "accessory" | "phone")[];
  onAdd: (line: LineInput) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const services = useServices();
  const products = useProducts();
  const pick = (line: LineInput) => {
    onAdd(line);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <PlusIcon data-icon="inline-start" />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <Command filter={searchFilter} loop>
          <CommandInput placeholder="Rechercher une prestation ou un produit…" />
          <CommandList className="max-h-80">
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            {sources.includes("service") && (
              <CommandGroup heading="Prestations">
                {(services.data ?? []).filter((s) => s.active).map((s) => (
                  <CommandItem key={s.id} value={`service ${s.name}`} onSelect={() => pick({ kind: "service", refId: s.id, label: s.name, qty: 1, unitPrice: s.priceFrom ?? 0, discount: 0 })}>
                    <WrenchIcon />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">{s.priceFrom ? formatXOF(s.priceFrom) : "—"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {sources.includes("product") && (
              <CommandGroup heading="Produits & pièces">
                {(products.data ?? [])
                  .filter((p) => p.active && (!productKinds || productKinds.includes(p.kind)))
                  .map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`produit ${p.sku} ${p.name} ${p.category}`}
                      disabled={p.qtyOnHand <= 0}
                      onSelect={() => pick({ kind: "product", refId: p.id, label: p.name, qty: 1, unitPrice: p.salePrice, discount: 0 })}
                    >
                      <PackageIcon />
                      <span className="truncate">{p.name}</span>
                      <span className={cn("ml-auto text-xs tabular-nums", p.qtyOnHand <= 0 ? "text-destructive" : "text-muted-foreground")}>
                        {p.qtyOnHand <= 0 ? "Rupture" : `${p.qtyOnHand} en stock`}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="ligne libre" onSelect={() => pick({ kind: "service", label: "", qty: 1, unitPrice: 0, discount: 0 })}>
                <PlusIcon />
                Ligne libre
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
