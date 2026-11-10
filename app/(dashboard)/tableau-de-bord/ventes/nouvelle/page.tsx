"use client";

import { ArrowLeftIcon, CheckCircle2Icon, MinusIcon, PackageIcon, PlusIcon, PrinterIcon, SearchIcon, ShoppingCartIcon, TrashIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Money } from "@/components/dashboard/kit";
import { SearchSelect } from "@/components/search-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateSale, useCustomers, useProducts } from "@/client/hooks";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD } from "@/shared/domain/labels";
import { lineTotal, linesTotal } from "@/shared/domain/money";
import type { PaymentMethod, Product, Sale } from "@/shared/domain/types";
import { formatPhone, formatXOF } from "@/shared/format";
import type { LineInput } from "@/shared/schemas/staff";

type Cart = (LineInput & { stock: number })[];
type Pay = { method: PaymentMethod; amount: number };

export default function PosPage() {
  const products = useProducts();
  const customers = useCustomers();
  const create = useCreateSale();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q).toLowerCase();
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Cart>([]);
  const [customerId, setCustomerId] = useState("");
  const [payments, setPayments] = useState<Pay[]>([{ method: "cash", amount: 0 }]);
  const [done, setDone] = useState<Sale | null>(null);

  const categories = useMemo(() => [...new Set((products.data ?? []).filter((p) => p.kind !== "part").map((p) => p.category))], [products.data]);
  const list = (products.data ?? []).filter(
    (p) => p.active && p.kind !== "part" && (category === "all" || p.category === category) && (!dq || p.name.toLowerCase().includes(dq) || p.sku.toLowerCase().includes(dq)),
  );
  const total = linesTotal(cart);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - paid;

  const add = (p: Product) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.refId === p.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: Math.min(l.stock, l.qty + 1) } : l));
      return [...c, { kind: "product", refId: p.id, label: p.name, qty: 1, unitPrice: p.salePrice, discount: 0, stock: p.qtyOnHand }];
    });
  const update = (i: number, patch: Partial<Cart[number]>) => setCart((c) => c.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const reset = () => {
    setCart([]);
    setPayments([{ method: "cash", amount: 0 }]);
    setCustomerId("");
    setDone(null);
  };

  const submit = () =>
    create.mutate(
      {
        customerId: customerId || undefined,
        lines: cart.map((l) => ({ kind: l.kind, refId: l.refId, label: l.label, qty: l.qty, unitPrice: l.unitPrice, discount: l.discount })),
        payments: payments.filter((p) => p.amount > 0),
      },
      { onSuccess: (sale) => setDone(sale) },
    );

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md animate-in flex-col items-center gap-5 py-16 text-center duration-300 fade-in zoom-in-95">
        <span className="grid size-16 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2Icon className="size-8" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Vente {done.number} enregistrée</h1>
          <p className="mt-1 text-muted-foreground">{formatXOF(linesTotal(done.lines))} encaissés.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<Link href={`/impression/recu/${done.id}`} target="_blank" />} nativeButton={false}>
            <PrinterIcon data-icon="inline-start" />
            Imprimer le reçu
          </Button>
          <Button variant="outline" onClick={reset}>
            Nouvelle vente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Nouvelle vente"
        actions={
          <Button variant="ghost" render={<Link href="/tableau-de-bord/ventes" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Ventes
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_27rem]">
        {/* Catalog */}
        <div className="flex min-w-0 flex-col gap-4">
          <InputGroup className="h-12 md:h-11">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un article ou une référence…" autoFocus />
          </InputGroup>
          <ToggleGroup value={[category]} onValueChange={(v) => v[0] && setCategory(v[0])} variant="outline" className="flex-wrap justify-start">
            <ToggleGroupItem value="all">Tout</ToggleGroupItem>
            {categories.map((c) => (
              <ToggleGroupItem key={c} value={c}>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products.isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            {!products.isLoading && !list.length && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Aucun article ne correspond.</p>
            )}
            {list.map((p) => {
              const inCart = cart.find((l) => l.refId === p.id)?.qty ?? 0;
              const out = p.qtyOnHand - inCart <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out}
                  onClick={() => add(p)}
                  className={cn(
                    "relative flex min-h-32 flex-col gap-2 rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/8 transition-[transform,box-shadow] duration-150 ease-out outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                    inCart > 0 && "ring-2 ring-brand",
                  )}
                >
                  {inCart > 0 && <span className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">{inCart}</span>}
                  <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <PackageIcon className="size-4" />
                  </span>
                  <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                  <span className="mt-auto flex items-end justify-between gap-2">
                    <span className="text-sm font-semibold text-primary tabular-nums">{formatXOF(p.salePrice)}</span>
                    <span className={cn("text-xs", p.qtyOnHand <= p.minQty ? "text-destructive" : "text-muted-foreground")}>{p.qtyOnHand} en stock</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <Card className="h-fit rounded-2xl lg:sticky lg:top-20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-4" />
              Panier
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Vider
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Touchez un article pour l&apos;ajouter.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {cart.map((l, i) => (
                  <li key={l.refId} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{l.label}</span>
                      <Button variant="ghost" size="icon-sm" aria-label="Retirer" onClick={() => setCart((c) => c.filter((_, j) => j !== i))}>
                        <TrashIcon />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border">
                        <Button variant="ghost" size="icon" className="rounded-r-none" aria-label="Diminuer" onClick={() => update(i, { qty: Math.max(1, l.qty - 1) })}>
                          <MinusIcon />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{l.qty}</span>
                        <Button variant="ghost" size="icon" className="rounded-l-none" aria-label="Augmenter" disabled={l.qty >= l.stock} onClick={() => update(i, { qty: l.qty + 1 })}>
                          <PlusIcon />
                        </Button>
                      </div>
                      <InputGroup className="w-32">
                        <InputGroupInput
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={500}
                          aria-label="Remise"
                          placeholder="Remise"
                          value={l.discount || ""}
                          onChange={(e) => update(i, { discount: Math.max(0, Number(e.target.value) || 0) })}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText className="text-xs">F</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      <Money value={lineTotal(l)} className="ml-auto text-sm font-semibold" />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" id="pos-customer-label">
                Client (facultatif)
              </span>
              <SearchSelect
                value={customerId}
                onValueChange={setCustomerId}
                aria-label="Client"
                placeholder="Client de passage"
                searchPlaceholder="Nom ou téléphone du client…"
                title="Client"
                noneOption={{ label: "Client de passage", description: "Vente sans fiche client" }}
                loading={customers.isLoading}
                options={(customers.data ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                  description: formatPhone(c.phone),
                  keywords: [c.phone, c.phone.slice(4)],
                }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paiement</span>
                <Button variant="ghost" size="sm" onClick={() => setPayments((p) => [...p, { method: "orange_money", amount: Math.max(0, remaining) }])}>
                  <PlusIcon data-icon="inline-start" />
                  Diviser
                </Button>
              </div>
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <NativeSelect
                    value={p.method}
                    onChange={(e) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, method: e.target.value as PaymentMethod } : x)))}
                    aria-label="Moyen de paiement"
                  >
                    {Object.entries(PAYMENT_METHOD).map(([v, label]) => (
                      <NativeSelectOption key={v} value={v}>
                        {label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <InputGroup className="flex-1">
                    <InputGroupInput
                      type="number"
                      inputMode="numeric"
                      min={0}
                      aria-label="Montant"
                      value={p.amount || ""}
                      onChange={(e) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x)))}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText className="text-xs">F</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {payments.length > 1 && (
                    <Button variant="ghost" size="icon" aria-label="Retirer le paiement" onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}>
                      <XIcon />
                    </Button>
                  )}
                </div>
              ))}
              {total > 0 && remaining !== 0 && (
                <Button variant="link" size="sm" className="w-fit px-0" onClick={() => setPayments((ps) => ps.map((x, j) => (j === ps.length - 1 ? { ...x, amount: Math.max(0, x.amount + remaining) } : x)))}>
                  {remaining > 0 ? `Compléter (${formatXOF(remaining)} restant)` : `Corriger (trop perçu ${formatXOF(-remaining)})`}
                </Button>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t">
            <div className="flex w-full items-end justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatXOF(total)}</span>
            </div>
            <Button variant="brand" size="lg" className="w-full" disabled={!cart.length || remaining !== 0 || create.isPending} onClick={submit}>
              {remaining !== 0 && cart.length ? "Le paiement doit égaler le total" : "Encaisser"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
