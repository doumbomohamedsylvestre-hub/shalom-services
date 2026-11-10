"use client";

import { PencilIcon, PhoneIcon, PlusIcon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useSaveSupplier, useSuppliers } from "@/client/hooks";
import { useSession } from "@/client/session";
import type { Supplier } from "@/shared/domain/types";
import { formatDate, formatPhone } from "@/shared/format";
import { supplierSchema, type SupplierInput } from "@/shared/schemas/staff";

export default function SuppliersPage() {
  const { can } = useSession();
  const suppliers = useSuppliers();
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description="Les réceptions de stock sont rattachées à un fournisseur."
        actions={
          can({ supplier: ["manage"] }) && (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon data-icon="inline-start" />
              Fournisseur
            </Button>
          )
        }
      />
      {suppliers.isLoading ? (
        <ListSkeleton />
      ) : suppliers.isError ? (
        <ErrorState onRetry={() => suppliers.refetch()} />
      ) : !suppliers.data?.length ? (
        <EmptyState icon={TruckIcon} title="Aucun fournisseur" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.data.map((s) => (
            <Card key={s.id} className="rounded-2xl">
              <CardHeader>
                <CardTitle>{s.name}</CardTitle>
                <CardDescription>{s.contact ?? "Pas de contact"}</CardDescription>
                {can({ supplier: ["manage"] }) && (
                  <CardAction>
                    <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEditing(s)}>
                      <PencilIcon />
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {s.notes && <p className="text-muted-foreground">{s.notes}</p>}
                <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                  <span className="text-muted-foreground">Réceptions</span>
                  <span className="font-medium">
                    {s.receiptsCount}
                    {s.lastReceiptAt && <span className="text-muted-foreground"> · dernière le {formatDate(s.lastReceiptAt)}</span>}
                  </span>
                </div>
                {s.phone && (
                  <Button variant="outline" render={<a href={`tel:${s.phone}`} />} nativeButton={false}>
                    <PhoneIcon data-icon="inline-start" />
                    {formatPhone(s.phone)}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <SupplierDialog supplier={editing === "new" ? undefined : (editing ?? undefined)} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}

function SupplierDialog({ supplier, open, onOpenChange }: { supplier?: Supplier; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveSupplier();
  const initial: SupplierInput = { name: supplier?.name ?? "", phone: supplier?.phone ?? "", contact: supplier?.contact ?? "", notes: supplier?.notes ?? "" };
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: supplierSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync({ input: value, id: supplier?.id });
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
            <DialogTitle>{supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
            <DialogDescription>Coordonnées utilisées pour les réceptions de stock.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="name">{(f) => <f.TextField label="Nom" />}</form.AppField>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="contact">{(f) => <f.TextField label="Personne à contacter" />}</form.AppField>
              <form.AppField name="phone">{(f) => <f.TextField label="Téléphone" type="tel" inputMode="tel" />}</form.AppField>
            </div>
            <form.AppField name="notes">{(f) => <f.TextareaField label="Notes" rows={2} />}</form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>{supplier ? "Enregistrer" : "Ajouter"}</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
