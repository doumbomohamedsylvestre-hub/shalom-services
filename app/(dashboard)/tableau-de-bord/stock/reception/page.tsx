"use client";

import { ArrowLeftIcon, PlusIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { SearchSelect, type SearchSelectOption } from "@/components/search-select";
import { useProducts, useReceiveStock, useSuppliers } from "@/client/hooks";
import { PRODUCT_KIND } from "@/shared/domain/labels";
import { formatPhone, formatXOF } from "@/shared/format";
import { stockReceiptSchema, type StockReceiptInput } from "@/shared/schemas/staff";

export default function StockReceiptPage() {
  const router = useRouter();
  const suppliers = useSuppliers();
  const products = useProducts();
  const receive = useReceiveStock();
  const productOptions: SearchSelectOption[] = (products.data ?? [])
    .filter((p) => p.active)
    .map((p) => ({
      value: p.id,
      label: p.name,
      description: `${p.sku} · ${p.category}`,
      meta: `${p.qtyOnHand} en stock`,
      metaTone: p.qtyOnHand === 0 ? "danger" : p.qtyOnHand <= p.minQty ? "warning" : "default",
      keywords: [p.sku, p.category, PRODUCT_KIND[p.kind]],
      group: PRODUCT_KIND[p.kind],
    }));
  const form = useAppForm({
    defaultValues: { supplierId: "", lines: [{ productId: "", qty: 1, unitCost: 0 }], amountPaid: 0, note: "" } as StockReceiptInput,
    validators: { onSubmit: stockReceiptSchema },
    onSubmit: async ({ value }) => {
      await receive.mutateAsync(value);
      router.push("/tableau-de-bord/stock");
    },
  });

  return (
    <form onSubmit={onFormSubmit(form)} noValidate className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Réception de stock"
        description="Chaque ligne augmente le stock et recalcule le coût moyen du produit."
        actions={
          <Button variant="ghost" render={<Link href="/tableau-de-bord/stock" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Stock
          </Button>
        }
      />
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Livraison</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="supplierId">
                {(f) => (
                  <f.SearchSelectField
                    label="Fournisseur"
                    placeholder="Choisir un fournisseur…"
                    searchPlaceholder="Nom ou téléphone du fournisseur…"
                    loading={suppliers.isLoading}
                    options={(suppliers.data ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                      description: [s.contact, s.phone && formatPhone(s.phone)].filter(Boolean).join(" · ") || undefined,
                      keywords: s.phone ? [s.phone] : undefined,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="amountPaid">{(f) => <f.MoneyField label="Montant payé au fournisseur" />}</form.AppField>
            </div>
            <form.AppField name="note">{(f) => <f.TextField label="Note (facultatif)" placeholder="N° de bon de livraison…" />}</form.AppField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Articles reçus</CardTitle>
          <CardDescription>Coût unitaire = prix payé par pièce.</CardDescription>
        </CardHeader>
        <CardContent>
          <form.Field name="lines" mode="array">
            {(linesField) => (
              <div className="flex flex-col gap-3">
                {linesField.state.value.map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_6rem_9rem_auto] sm:items-start sm:border-0 sm:p-0">
                    <form.Field name={`lines[${i}].productId`}>
                      {(f) => (
                        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                          <SearchSelect
                            value={f.state.value}
                            onValueChange={(v) => {
                              f.handleChange(v);
                              const p = products.data?.find((x) => x.id === v);
                              if (p) form.setFieldValue(`lines[${i}].unitCost`, p.avgCost);
                            }}
                            options={productOptions}
                            loading={products.isLoading}
                            placeholder="Choisir un produit…"
                            searchPlaceholder="Nom, référence ou catégorie…"
                            title="Produit reçu"
                            aria-label="Produit"
                            invalid={f.state.meta.errors.length > 0}
                          />
                          <FieldError errors={f.state.meta.errors as { message?: string }[]} />
                        </div>
                      )}
                    </form.Field>
                    <form.Field name={`lines[${i}].qty`}>
                      {(f) => (
                        <InputGroup>
                          <InputGroupInput type="number" inputMode="numeric" min={1} aria-label="Quantité" value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value) || 0)} />
                          <InputGroupAddon align="inline-end">
                            <InputGroupText>pcs</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      )}
                    </form.Field>
                    <form.Field name={`lines[${i}].unitCost`}>
                      {(f) => (
                        <InputGroup className="col-start-1 sm:col-start-auto">
                          <InputGroupInput type="number" inputMode="numeric" min={0} step={500} aria-label="Coût unitaire" value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value) || 0)} />
                          <InputGroupAddon align="inline-end">
                            <InputGroupText>F</InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                      )}
                    </form.Field>
                    <Button type="button" variant="ghost" size="icon" aria-label="Retirer" className="row-start-2 sm:row-start-auto" onClick={() => linesField.removeValue(i)} disabled={linesField.state.value.length === 1}>
                      <TrashIcon />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-fit" onClick={() => linesField.pushValue({ productId: "", qty: 1, unitCost: 0 })}>
                  <PlusIcon data-icon="inline-start" />
                  Ajouter une ligne
                </Button>
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4">
        <form.Subscribe selector={(s) => s.values.lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0)}>
          {(total) => (
            <p className="text-sm text-muted-foreground">
              Valeur reçue <span className="ml-1 text-lg font-semibold text-foreground tabular-nums">{formatXOF(total)}</span>
            </p>
          )}
        </form.Subscribe>
        <form.AppForm>
          <form.SubmitButton variant="brand" pendingLabel="Enregistrement…">
            Valider la réception
          </form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  );
}
