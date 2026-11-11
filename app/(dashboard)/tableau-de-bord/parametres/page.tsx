"use client";

import { EyeIcon, EyeOffIcon, ImageUpIcon, LoaderCircleIcon, LockIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { toast } from "sonner";
import { uploadServiceImage } from "@/client/api";
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
import {
  useCreateExpenseCategory,
  useCreateProductCategory,
  useExpenseCategories,
  useProductCategories,
  useSaveService,
  useSaveSettings,
  useServices,
  useSettings,
} from "@/client/hooks";
import { useSession } from "@/client/session";
import type { Service, ShopSettings } from "@/shared/domain/types";
import { serviceSchema, settingsSchema, type ServiceInput, type SettingsInput } from "@/shared/schemas/staff";

export default function SettingsPage() {
  const { can } = useSession();
  if (!can({ settings: ["update"] })) return <EmptyState icon={LockIcon} title="Accès réservé" description="Les paramètres sont réservés à l'administrateur." />;
  return (
    <>
      <PageHeader title="Paramètres" description="Informations de la boutique, prestations affichées sur le site, catégories de produits et de dépenses." />
      <Tabs defaultValue="boutique">
        <TabsList>
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
          <TabsTrigger value="prestations">Prestations</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
        </TabsList>
        <TabsContent value="boutique" className="mt-6">
          <ShopSettingsTab />
        </TabsContent>
        <TabsContent value="prestations" className="mt-6">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="stock" className="mt-6">
          <ProductCategoriesTab />
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
      hours: settings.hours.length ? settings.hours : [{ days: "Lundi – Samedi", open: "08:00", close: "20:00" }],
      mapUrl: settings.mapUrl ?? "",
      mapEmbedUrl: settings.mapEmbedUrl ?? "",
      taxRate: settings.taxRate,
      salePrefix: settings.prefixes.sale,
      invoicePrefix: settings.prefixes.invoice,
    } satisfies SettingsInput,
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
          <CardTitle>Horaires et plan</CardTitle>
          <CardDescription>Affichés sur l&apos;accueil, la page Contact et le pied de page du site.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">Horaires d&apos;ouverture</FieldLegend>
              <form.Field name="hours" mode="array">
                {(hours) => (
                  <div className="flex flex-col gap-3">
                    {hours.state.value.map((_, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
                        <form.AppField name={`hours[${i}].days`}>
                          {(f) => <f.TextField label={`Jours, plage ${i + 1}`} hideLabel placeholder="Lundi – Samedi" className="col-span-1" />}
                        </form.AppField>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Retirer la plage ${i + 1}`}
                          className="sm:order-last"
                          disabled={hours.state.value.length === 1}
                          onClick={() => hours.removeValue(i)}
                        >
                          <TrashIcon />
                        </Button>
                        <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:contents">
                          <form.AppField name={`hours[${i}].open`}>{(f) => <f.TextField label={`Ouverture, plage ${i + 1}`} hideLabel type="time" />}</form.AppField>
                          <form.AppField name={`hours[${i}].close`}>{(f) => <f.TextField label={`Fermeture, plage ${i + 1}`} hideLabel type="time" />}</form.AppField>
                        </div>
                      </div>
                    ))}
                    {hours.state.value.length < 7 && (
                      <Button type="button" variant="outline" className="w-fit" onClick={() => hours.pushValue({ days: "", open: "08:00", close: "18:00" })}>
                        <PlusIcon data-icon="inline-start" />
                        Ajouter une plage
                      </Button>
                    )}
                  </div>
                )}
              </form.Field>
            </FieldSet>
            <form.AppField name="mapUrl">
              {(f) => <f.TextField label="Lien Google Maps" type="url" inputMode="url" placeholder="https://maps.google.com/?q=…" description="Bouton « Itinéraire » de la page Contact." />}
            </form.AppField>
            <form.AppField name="mapEmbedUrl">
              {(f) => (
                <f.TextField
                  label="Carte intégrée (lien d'intégration)"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.google.com/maps?q=…&output=embed"
                  description="Google Maps › Partager › Intégrer une carte, puis copiez l'adresse du « src »."
                />
              )}
            </form.AppField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Numérotation des ventes et des factures, et taux de TVA (0 % tant que le comptable n&apos;a pas confirmé).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <form.AppField name="salePrefix">{(f) => <f.TextField label="Préfixe des ventes" description="Ex. V → V-00012" autoCapitalize="characters" />}</form.AppField>
            <form.AppField name="invoicePrefix">{(f) => <f.TextField label="Préfixe des factures" description="Ex. F → F-00012" autoCapitalize="characters" />}</form.AppField>
            <form.AppField name="taxRate">{(f) => <f.NumberField label="TVA" suffix="%" />}</form.AppField>
          </div>
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
    image: "",
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
            <DialogDescription>Visible sur le site public et dans les devis.</DialogDescription>
          </DialogHeader>
          <form.Field name="image">
            {(f) => <ServiceImagePicker value={f.state.value || service?.image || "/assets/services/service-precision-repair.webp"} onChange={f.handleChange} />}
          </form.Field>
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

/** Card image with an in-place "change" control; the photo is compressed and uploaded at once. */
function ServiceImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setPreview(local);
    setUploading(true);
    try {
      onChange(await uploadServiceImage(file));
      toast.success("Image envoyée. Enregistrez pour l'appliquer.");
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error ? e.message : "L'envoi de l'image a échoué.");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(local);
    }
  };
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview while uploading */}
      {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <Image src={value} alt="" fill sizes="32rem" className="object-cover" />}
      <div className="absolute inset-x-0 bottom-0 flex justify-end bg-linear-to-t from-black/45 to-transparent p-3">
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => pick(e.target.files?.[0])} />
        <Button render={<label htmlFor={inputId} />} nativeButton={false} size="sm" variant="secondary" disabled={uploading} className="cursor-pointer">
          {uploading ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin motion-reduce:animate-none" /> : <ImageUpIcon data-icon="inline-start" />}
          {uploading ? "Envoi…" : "Changer l'image"}
        </Button>
      </div>
    </div>
  );
}

function ProductCategoriesTab() {
  const categories = useProductCategories();
  const create = useCreateProductCategory();
  return (
    <CategoriesCard
      title="Catégories de produits"
      description="Utilisées pour ranger le stock et filtrer la caisse."
      names={categories.data}
      loading={categories.isLoading}
      error={categories.isError}
      onRetry={() => categories.refetch()}
      pending={create.isPending}
      onCreate={(name, done) => create.mutate(name, { onSuccess: done })}
    />
  );
}

function ExpenseCategoriesTab() {
  const categories = useExpenseCategories();
  const create = useCreateExpenseCategory();
  return (
    <CategoriesCard
      title="Catégories de dépenses"
      description="Utilisées pour classer les dépenses dans les rapports."
      names={categories.data?.map((c) => c.name)}
      loading={categories.isLoading}
      error={categories.isError}
      onRetry={() => categories.refetch()}
      pending={create.isPending}
      onCreate={(name, done) => create.mutate(name, { onSuccess: done })}
    />
  );
}

function CategoriesCard({
  title,
  description,
  names,
  loading,
  error,
  onRetry,
  pending,
  onCreate,
}: {
  title: string;
  description: string;
  names?: string[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  pending: boolean;
  onCreate: (name: string, done: () => void) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Card className="max-w-xl rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <ListSkeleton rows={2} />
        ) : error ? (
          <ErrorState onRetry={onRetry} />
        ) : names?.length ? (
          <ul className="flex flex-wrap gap-2">
            {names.map((n) => (
              <li key={n} className="max-w-full truncate rounded-full bg-muted px-3 py-1.5 text-sm">
                {n}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune catégorie pour l&apos;instant.</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim(), () => setName(""));
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" maxLength={60} />
          <Button type="submit" variant="outline" disabled={!name.trim() || pending}>
            Ajouter
          </Button>
        </form>
        <FieldDescription>Les catégories utilisées ne se suppriment pas, pour garder l&apos;historique cohérent.</FieldDescription>
      </CardContent>
    </Card>
  );
}
