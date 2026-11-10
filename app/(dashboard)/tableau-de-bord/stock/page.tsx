"use client";

import { BoxesIcon, PackagePlusIcon, PencilIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useDeferredValue, useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { EmptyState, ErrorState, ListSkeleton, Money, SearchInput, StatCard } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { MovementBadge, ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAdjustStock, useMovements, useProductCategories, useProducts, useSaveProduct } from "@/client/hooks";
import { useSession } from "@/client/session";
import { cn } from "@/lib/utils";
import { PRODUCT_KIND } from "@/shared/domain/labels";
import type { Product, ProductKind } from "@/shared/domain/types";
import { formatDateTime, formatNumber } from "@/shared/format";
import { productSchema, stockAdjustmentSchema, type ProductInput, type StockAdjustmentInput } from "@/shared/schemas/staff";

export default function StockPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Stock />
    </Suspense>
  );
}

function Stock() {
  const { can } = useSession();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q).toLowerCase();
  const [kind, setKind] = useState<"all" | ProductKind | "low">(params.get("filtre") === "bas" ? "low" : "all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const products = useProducts();

  const list = (products.data ?? []).filter(
    (p) =>
      (kind === "all" ? true : kind === "low" ? p.qtyOnHand <= p.minQty : p.kind === kind) &&
      (!dq || p.name.toLowerCase().includes(dq) || p.sku.toLowerCase().includes(dq)),
  );
  const value = (products.data ?? []).reduce((s, p) => s + p.qtyOnHand * p.avgCost, 0);
  const low = (products.data ?? []).filter((p) => p.qtyOnHand <= p.minQty).length;

  return (
    <>
      <PageHeader
        title="Stock"
        description="Pièces, accessoires et téléphones. Coût moyen pondéré mis à jour à chaque réception."
        actions={
          <>
            {can({ inventory: ["adjust"] }) && (
              <Button variant="outline" onClick={() => setEditing("new")}>
                <PlusIcon data-icon="inline-start" />
                Produit
              </Button>
            )}
            {can({ inventory: ["receive"] }) && (
              <Button render={<Link href="/tableau-de-bord/stock/reception" />} nativeButton={false}>
                <PackagePlusIcon data-icon="inline-start" />
                Réception
              </Button>
            )}
          </>
        }
      />

      {can({ report: ["read"] }) && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Valeur du stock (coût)" value={<Money value={value} />} icon={BoxesIcon} loading={products.isLoading} />
          <StatCard label="Produits sous le seuil" value={low} icon={SlidersHorizontalIcon} tone="warning" loading={products.isLoading} />
        </div>
      )}

      <Tabs defaultValue="produits">
        <TabsList>
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
        </TabsList>
        <TabsContent value="produits" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ToggleGroup value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as typeof kind)} variant="outline" className="flex-wrap">
              <ToggleGroupItem value="all">Tous</ToggleGroupItem>
              <ToggleGroupItem value="part">Pièces</ToggleGroupItem>
              <ToggleGroupItem value="accessory">Accessoires</ToggleGroupItem>
              <ToggleGroupItem value="phone">Téléphones</ToggleGroupItem>
              <ToggleGroupItem value="low">Stock bas</ToggleGroupItem>
            </ToggleGroup>
            <SearchInput value={q} onChange={setQ} placeholder="Nom ou référence…" />
          </div>
          {products.isLoading ? (
            <ListSkeleton />
          ) : products.isError ? (
            <ErrorState onRetry={() => products.refetch()} />
          ) : !list.length ? (
            <EmptyState icon={BoxesIcon} title="Aucun produit" description="Modifiez le filtre ou ajoutez un produit." />
          ) : (
            <Card className="rounded-2xl py-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Produit</TableHead>
                    <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                    <TableHead className="text-right">En stock</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Prix</TableHead>
                    {can({ report: ["read"] }) && <TableHead className="hidden text-right lg:table-cell">Coût moyen</TableHead>}
                    <TableHead className="w-0 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((p) => {
                    const isLow = p.qtyOnHand <= p.minQty;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="pl-5">
                          <p className="font-medium">{p.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p>{p.category}</p>
                          <p className="text-xs text-muted-foreground">{PRODUCT_KIND[p.kind]}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("font-semibold tabular-nums", p.qtyOnHand === 0 && "text-destructive")}>{formatNumber(p.qtyOnHand)}</span>
                            {isLow && <ToneBadge tone={p.qtyOnHand === 0 ? "danger" : "warning"}>{p.qtyOnHand === 0 ? "Rupture" : `Seuil ${p.minQty}`}</ToneBadge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          <Money value={p.salePrice} />
                        </TableCell>
                        {can({ report: ["read"] }) && (
                          <TableCell className="hidden text-right lg:table-cell">
                            <Money value={p.avgCost} muted />
                          </TableCell>
                        )}
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-1">
                            {can({ inventory: ["adjust"] }) && (
                              <>
                                <Button variant="ghost" size="icon" aria-label="Ajuster le stock" onClick={() => setAdjusting(p)}>
                                  <SlidersHorizontalIcon />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEditing(p)}>
                                  <PencilIcon />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="mouvements" className="mt-4">
          <Movements />
        </TabsContent>
      </Tabs>

      <ProductDialog product={editing === "new" ? undefined : (editing ?? undefined)} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
      <AdjustDialog product={adjusting} onOpenChange={(o) => !o && setAdjusting(null)} />
    </>
  );
}

function Movements() {
  const movements = useMovements();
  if (movements.isLoading) return <ListSkeleton />;
  if (movements.isError) return <ErrorState onRetry={() => movements.refetch()} />;
  return (
    <Card className="rounded-2xl py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Date</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="hidden md:table-cell">Référence</TableHead>
            <TableHead className="hidden pr-5 lg:table-cell">Par</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(movements.data ?? []).slice(0, 80).map((m) => (
            <TableRow key={m.id}>
              <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{formatDateTime(m.at)}</TableCell>
              <TableCell className="font-medium">{m.productName}</TableCell>
              <TableCell>
                <MovementBadge type={m.type} />
              </TableCell>
              <TableCell className={cn("text-right font-semibold tabular-nums", m.qtyDelta > 0 ? "text-success" : "text-foreground")}>
                {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
              </TableCell>
              <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">{m.reason ?? m.ref ?? "—"}</TableCell>
              <TableCell className="hidden pr-5 text-muted-foreground lg:table-cell">{m.by}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ProductDialog({ product, open, onOpenChange }: { product?: Product; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveProduct();
  const categories = useProductCategories();
  const initial: ProductInput = {
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    kind: product?.kind ?? "part",
    category: product?.category ?? "",
    salePrice: product?.salePrice ?? 0,
    minQty: product?.minQty ?? 2,
  };
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: productSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync({ input: value, id: product?.id });
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) form.reset(initial);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            <DialogDescription>Le stock et le coût moyen viennent des réceptions, pas de ce formulaire.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
              <form.AppField name="sku">{(f) => <f.TextField label="Référence" placeholder="ECR-IP11" />}</form.AppField>
              <form.AppField name="name">{(f) => <f.TextField label="Nom" />}</form.AppField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="kind">
                {(f) => <f.SelectField label="Type" options={Object.entries(PRODUCT_KIND).map(([value, label]) => ({ value, label }))} />}
              </form.AppField>
              <form.AppField name="category">
                {(f) => <f.SelectField label="Catégorie" options={(categories.data ?? []).map((c) => ({ value: c, label: c }))} />}
              </form.AppField>
              <form.AppField name="salePrice">{(f) => <f.MoneyField label="Prix de vente" />}</form.AppField>
              <form.AppField name="minQty">{(f) => <f.NumberField label="Seuil d'alerte" description="Alerte quand le stock atteint ce niveau." />}</form.AppField>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>{product ? "Enregistrer" : "Ajouter"}</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ product, onOpenChange }: { product: Product | null; onOpenChange: (o: boolean) => void }) {
  const adjust = useAdjustStock();
  const form = useAppForm({
    defaultValues: { productId: product?.id ?? "", qtyDelta: -1, reason: "" } as StockAdjustmentInput,
    validators: { onSubmit: stockAdjustmentSchema },
    onSubmit: async ({ value }) => {
      await adjust.mutateAsync({ ...value, productId: product!.id });
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={!!product}
      onOpenChange={(o) => {
        if (o && product) form.reset({ productId: product.id, qtyDelta: -1, reason: "" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Ajuster le stock</DialogTitle>
            <DialogDescription>
              {product?.name} · actuellement <strong className="text-foreground">{product?.qtyOnHand}</strong>. Utilisez un nombre négatif pour retirer
              (casse, perte), positif pour ajouter.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="qtyDelta">{(f) => <f.NumberField label="Variation" min={-9999} />}</form.AppField>
            <form.AppField name="reason">{(f) => <f.TextareaField label="Motif" placeholder="Ex. pièce défectueuse à la réception" rows={2} />}</form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>Ajuster</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
