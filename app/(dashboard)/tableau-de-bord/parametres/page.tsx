"use client";

import { EyeIcon, EyeOffIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { EmptyState, ErrorState, ListSkeleton, Money } from "@/components/dashboard/kit";
import { PageHeader } from "@/components/dashboard/page-header";
import { ToneBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateExpenseCategory, useExpenseCategories, useSaveService, useSaveSettings, useServices, useSettings } from "@/client/hooks";
import { useSession } from "@/client/session";
import type { Service, ShopSettings } from "@/shared/domain/types";
import { serviceSchema, settingsSchema, type ServiceInput, type SettingsInput } from "@/shared/schemas/staff";

export default function SettingsPage() {
  const { can } = useSession();
  if (!can({ settings: ["update"] })) return <EmptyState icon={LockIcon} title="Accès réservé" description="Les paramètres sont réservés à l'administrateur." />;
  return (
    <>
      <PageHeader title="Paramètres" description="Informations de la boutique, prestations affichées sur le site et catégories de dépenses." />
      <Tabs defaultValue="boutique">
        <TabsList>
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
          <TabsTrigger value="prestations">Prestations</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
        </TabsList>
        <TabsContent value="boutique" className="mt-6">
          <ShopSettingsTab />
        </TabsContent>
        <TabsContent value="prestations" className="mt-6">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="depenses" className="mt-6">
          <ExpenseCategoriesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ShopSettingsTab() {
  const settings = useSettings();
  if (settings.isLoading) return <ListSkeleton rows={6} />;
  if (settings.isError || !settings.data) return <ErrorState onRetry={() => settings.refetch()} />;
  return <ShopSettingsForm settings={settings.data} />;
}

function ShopSettingsForm({ settings }: { settings: ShopSettings }) {
  const save = useSaveSettings();
  const form = useAppForm({
    defaultValues: {
      name: settings.name,
      address: settings.address,
      city: settings.city,
      phones: settings.phones.map((p) => p.replace(/^\+223/, "")),
      whatsapp: settings.whatsapp.replace(/^\+223/, ""),
      email: settings.email ?? "",
      terms: settings.terms,
      quoteReady: settings.whatsappTemplates.quoteReady,
      repairReady: settings.whatsappTemplates.repairReady,
    } as SettingsInput,
    validators: { onSubmit: settingsSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(value);
    },
  });

  return (
    <form onSubmit={onFormSubmit(form)} noValidate className="flex max-w-3xl flex-col gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
          <CardDescription>Affichées sur le site public, les tickets et les factures.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <form.AppField name="name">{(f) => <f.TextField label="Nom commercial" />}</form.AppField>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="address">{(f) => <f.TextField label="Adresse" />}</form.AppField>
              <form.AppField name="city">{(f) => <f.TextField label="Ville" />}</form.AppField>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Téléphones</FieldLegend>
              <form.Field name="phones" mode="array">
                {(phones) => (
                  <div className="flex flex-col gap-3">
                    {phones.state.value.map((_, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <form.AppField name={`phones[${i}]`}>{(f) => <f.PhoneField label={`Téléphone ${i + 1}`} hideLabel className="flex-1" />}</form.AppField>
                        <Button type="button" variant="ghost" size="icon" aria-label="Retirer" disabled={phones.state.value.length === 1} onClick={() => phones.removeValue(i)}>
                          <TrashIcon />
                        </Button>
                      </div>
                    ))}
                    {phones.state.value.length < 3 && (
                      <Button type="button" variant="outline" className="w-fit" onClick={() => phones.pushValue("")}>
                        <PlusIcon data-icon="inline-start" />
                        Ajouter un numéro
                      </Button>
                    )}
                  </div>
                )}
              </form.Field>
            </FieldSet>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="whatsapp">{(f) => <f.PhoneField label="WhatsApp" />}</form.AppField>
              <form.AppField name="email">{(f) => <f.TextField label="E-mail (facultatif)" type="email" />}</form.AppField>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Messages WhatsApp</CardTitle>
          <CardDescription>
            Variables : <code className="font-mono text-xs">{"{client}"}</code>, <code className="font-mono text-xs">{"{appareil}"}</code>,{" "}
            <code className="font-mono text-xs">{"{montant}"}</code>, <code className="font-mono text-xs">{"{code}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <form.AppField name="quoteReady">{(f) => <f.TextareaField label="Devis prêt" rows={3} />}</form.AppField>
            <form.AppField name="repairReady">{(f) => <f.TextareaField label="Réparation prête" rows={3} />}</form.AppField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Conditions</CardTitle>
          <CardDescription>Imprimées au bas du ticket de dépôt.</CardDescription>
        </CardHeader>
        <CardContent>
          <form.AppField name="terms">{(f) => <f.TextareaField label="Conditions de dépôt" hideLabel rows={5} />}</form.AppField>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <form.AppForm>
            <form.SubmitButton>Enregistrer les paramètres</form.SubmitButton>
          </form.AppForm>
        </CardFooter>
      </Card>
    </form>
  );
}

function ServicesTab() {
  const services = useServices();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  if (services.isLoading) return <ListSkeleton />;
  if (services.isError) return <ErrorState onRetry={() => services.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Les prestations visibles apparaissent sur le site public et dans les devis.</p>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon data-icon="inline-start" />
          Prestation
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(services.data ?? []).map((s) => (
          <Card key={s.id} className="gap-0 overflow-hidden rounded-2xl pt-0">
            <div className="relative aspect-[16/9] bg-muted">
              <Image src={s.image} alt="" fill sizes="400px" className="object-cover" />
            </div>
            <CardContent className="flex flex-col gap-2 pt-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{s.name}</p>
                <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEditing(s)}>
                  <PencilIcon />
                </Button>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                {s.priceFrom ? (
                  <span>
                    Dès <Money value={s.priceFrom} className="font-medium" />
                  </span>
                ) : (
                  <span>Sur devis</span>
                )}
                {s.isPublic ? (
                  <ToneBadge tone="success">
                    <EyeIcon className="size-3" />
                    Visible
                  </ToneBadge>
                ) : (
                  <ToneBadge tone="neutral">
                    <EyeOffIcon className="size-3" />
                    Masquée
                  </ToneBadge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ServiceDialog service={editing === "new" ? undefined : (editing ?? undefined)} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

function ServiceDialog({ service, open, onOpenChange }: { service?: Service; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveService();
  const initial: ServiceInput = {
    name: service?.name ?? "",
    summary: service?.summary ?? "",
    description: service?.description ?? "",
    priceFrom: service?.priceFrom ?? null,
    durationLabel: service?.durationLabel ?? "",
    isPublic: service?.isPublic ?? true,
    active: service?.active ?? true,
  };
  const form = useAppForm({
    defaultValues: initial,
    validators: { onSubmit: serviceSchema },
    onSubmit: async ({ value }) => {
      await save.mutateAsync({ input: value, id: service?.id });
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onFormSubmit(form)} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{service ? "Modifier la prestation" : "Nouvelle prestation"}</DialogTitle>
            <DialogDescription>L&apos;image se change une fois le stockage de fichiers branché.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <form.AppField name="name">{(f) => <f.TextField label="Nom" />}</form.AppField>
            <form.AppField name="summary">{(f) => <f.TextareaField label="Résumé (carte)" rows={2} />}</form.AppField>
            <form.AppField name="description">{(f) => <f.TextareaField label="Description (page Services)" rows={3} />}</form.AppField>
            <div className="grid gap-5 sm:grid-cols-2">
              <form.AppField name="priceFrom">{(f) => <f.MoneyField label="Prix à partir de" description="Vide = sur devis." />}</form.AppField>
              <form.AppField name="durationLabel">{(f) => <f.TextField label="Durée indicative" placeholder="Ex. 1 à 2 h" />}</form.AppField>
            </div>
            <form.AppField name="isPublic">{(f) => <f.SwitchField label="Visible sur le site" description="Afficher dans la liste publique des services." />}</form.AppField>
            <form.AppField name="active">{(f) => <f.SwitchField label="Active" description="Proposée dans les devis et les tickets." />}</form.AppField>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <form.AppForm>
              <form.SubmitButton>{service ? "Enregistrer" : "Ajouter"}</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseCategoriesTab() {
  const categories = useExpenseCategories();
  const create = useCreateExpenseCategory();
  const [name, setName] = useState("");
  return (
    <Card className="max-w-xl rounded-2xl">
      <CardHeader>
        <CardTitle>Catégories de dépenses</CardTitle>
        <CardDescription>Utilisées pour classer les dépenses dans les rapports.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-wrap gap-2">
          {(categories.data ?? []).map((c) => (
            <li key={c.id} className="rounded-full bg-muted px-3 py-1.5 text-sm">
              {c.name}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim(), { onSuccess: () => setName("") });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" />
          <Button type="submit" variant="outline" disabled={!name.trim() || create.isPending}>
            Ajouter
          </Button>
        </form>
        <FieldDescription>Les catégories utilisées ne se suppriment pas, pour garder l&apos;historique cohérent.</FieldDescription>
      </CardContent>
    </Card>
  );
}
