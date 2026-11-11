"use client";

import { KeyRoundIcon, LockIcon, MoreHorizontalIcon, PlusIcon, ShieldCheckIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { ToneBadge } from "@/components/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateStaff, useResetStaffPassword, useStaff, useUpdateStaff } from "@/client/hooks";
import { useSession } from "@/client/session";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/shared/auth/permissions";
import type { StaffUser } from "@/shared/domain/types";
import { formatRelative, initials } from "@/shared/format";
import { resetPasswordSchema, staffUserSchema, type StaffUserInput } from "@/shared/schemas/staff";

const ROLE_HINT: Record<Role, string> = {
  admin: "Tout, y compris finances, annulations et équipe.",
  reception: "Comptoir : clients, dépôts, ventes, paiements.",
  technician: "File d'attente et ses réparations.",
};

export default function TeamPage() {
  const { can, user: me } = useSession();
  const allowed = can({ user: ["list"] });
  const staff = useStaff({ enabled: allowed });
  const update = useUpdateStaff();
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<StaffUser | null>(null);
  const [banFor, setBanFor] = useState<StaffUser | null>(null);

  if (!allowed) return <EmptyState icon={LockIcon} title="Accès réservé" description="La gestion de l'équipe est réservée à l'administrateur." />;

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Comptes du personnel. Pas d'inscription publique : seul l'administrateur crée les comptes."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Nouveau compte
          </Button>
        }
      />
      {staff.isLoading ? (
        <ListSkeleton />
      ) : staff.isError ? (
        <ErrorState onRetry={() => staff.refetch()} />
      ) : (
        <Card className="rounded-2xl py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Dernière activité</TableHead>
                <TableHead className="w-0 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(staff.data ?? []).map((u) => (
                <TableRow key={u.id} className={cn(u.banned && "opacity-60")}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/8 text-xs text-primary">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="truncate">{u.name}</span>
                          {u.id === me.id && <ToneBadge tone="neutral">Vous</ToneBadge>}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">{ROLE_LABELS[u.role]}</span>
                      {u.banned && <ToneBadge tone="danger">Désactivé</ToneBadge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{u.lastSeenAt ? formatRelative(u.lastSeenAt) : "Jamais"}</TableCell>
                  <TableCell className="pr-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions pour ${u.name}`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ShieldCheckIcon />
                            Changer le rôle
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={u.role} onValueChange={(v) => update.mutate({ id: u.id, role: v as Role })}>
                              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                                <DropdownMenuRadioItem key={r} value={r} disabled={u.id === me.id}>
                                  {ROLE_LABELS[r]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem disabled={u.id === me.id} onClick={() => setResetFor(u)}>
                          <KeyRoundIcon />
                          Réinitialiser le mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {u.banned ? (
                          <DropdownMenuItem onClick={() => update.mutate({ id: u.id, banned: false })}>
                            <UserCheckIcon />
                            Réactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem variant="destructive" disabled={u.id === me.id} onClick={() => setBanFor(u)}>
                            <UserXIcon />
                            Désactiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CreateStaffDialog open={creating} onOpenChange={setCreating} />
      <ResetPasswordDialog user={resetFor} onOpenChange={(o) => !o && setResetFor(null)} />
      <AlertDialog open={!!banFor} onOpenChange={(o) => !o && setBanFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver {banFor?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              La personne est déconnectée immédiatement et ne peut plus se connecter. Son historique est conservé. Vous pourrez réactiver le compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (banFor) update.mutate({ id: banFor.id, banned: true });
                setBanFor(null);
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateStaff();
  const initial: StaffUserInput = { name: "", username: "", role: "technician", password: "" };
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: staffUserSchema },
    onSubmit: async ({ value }) => {
      await create.mutateAsync(staffUserSchema.parse(value));
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
            <DialogTitle>Nouveau compte</DialogTitle>
            <DialogDescription>Communiquez l&apos;identifiant et le mot de passe à la personne en main propre.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="name">{(f) => <f.TextField label="Nom complet" />}</form.AppField>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="username">
                {(f) => <f.TextField label="Identifiant" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="ex. aissata" />}
              </form.AppField>
              <form.AppField name="password">
                {(f) => <f.TextField label="Mot de passe initial" type="text" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />}
              </form.AppField>
            </div>
            <form.AppField name="role">
              {(f) => (
                <f.SelectField
                  label="Rôle"
                  options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: `${ROLE_LABELS[r]} · ${ROLE_HINT[r]}` }))}
                />
              )}
            </form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>Créer le compte</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onOpenChange }: { user: StaffUser | null; onOpenChange: (o: boolean) => void }) {
  const reset = useResetStaffPassword();
  const form = useAppForm({
    defaultValues: { password: "" },
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      await reset.mutateAsync({ id: user!.id, password: value.password });
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => {
        if (o) form.reset({ password: "" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Nouveau mot de passe pour {user?.name}</DialogTitle>
            <DialogDescription>La personne sera déconnectée de tous ses appareils. Communiquez-lui le nouveau mot de passe en main propre.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="password">
              {(f) => <f.TextField label="Mot de passe" type="text" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} description="8 caractères minimum." />}
            </form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>Enregistrer</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
