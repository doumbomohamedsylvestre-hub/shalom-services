"use client";

import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useSaveCustomer } from "@/client/hooks";
import type { Customer } from "@/shared/domain/types";
import { customerSchema, type CustomerInput } from "@/shared/schemas/staff";

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer?: Customer;
}) {
  const save = useSaveCustomer();
  const initial: CustomerInput = {
    name: customer?.name ?? "",
    phone: customer?.phone.replace(/^\+223/, "") ?? "",
    altPhone: customer?.altPhone ?? "",
    notes: customer?.notes ?? "",
  };
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: customerSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync({ input: value, id: customer?.id });
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
            <DialogTitle>{customer ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>Un numéro de téléphone correspond à un seul client.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="name">{(f) => <f.TextField label="Nom complet" />}</form.AppField>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="phone">{(f) => <f.PhoneField label="Téléphone" />}</form.AppField>
              <form.AppField name="altPhone">{(f) => <f.PhoneField label="Autre numéro (facultatif)" placeholder="" />}</form.AppField>
            </div>
            <form.AppField name="notes">{(f) => <f.TextareaField label="Notes" rows={3} />}</form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>{customer ? "Enregistrer" : "Ajouter"}</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
