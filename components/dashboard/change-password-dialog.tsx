"use client";

import { toast } from "sonner";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema, type ChangePasswordInput } from "@/shared/schemas/staff";

const initial: ChangePasswordInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** The signed-in staff member changes their own password; other devices are signed out. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        if (error.code === "INVALID_PASSWORD") {
          form.setFieldValue("currentPassword", "");
          toast.error("Mot de passe actuel incorrect.");
        } else if (error.status === 429) {
          toast.error("Trop de tentatives. Patientez une minute puis réessayez.");
        } else {
          toast.error("Impossible de changer le mot de passe. Réessayez.");
        }
        return;
      }
      toast.success("Mot de passe modifié. Vos autres appareils ont été déconnectés.");
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Changer mon mot de passe</DialogTitle>
            <DialogDescription>Vos sessions ouvertes sur d&apos;autres appareils seront fermées.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="currentPassword">
              {(f) => <f.TextField label="Mot de passe actuel" type="password" autoComplete="current-password" />}
            </form.AppField>
            <form.AppField name="newPassword">
              {(f) => <f.TextField label="Nouveau mot de passe" type="password" autoComplete="new-password" description="8 caractères minimum." />}
            </form.AppField>
            <form.AppField name="confirmPassword">
              {(f) => <f.TextField label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" />}
            </form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton pendingLabel="Enregistrement…">Enregistrer</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
