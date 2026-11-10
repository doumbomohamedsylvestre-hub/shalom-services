"use client";

import { ArrowLeftIcon, ClipboardListIcon, SmartphoneIcon, UserIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { LinesEditor } from "@/components/dashboard/lines-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchSelect } from "@/components/search-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateRepair, useCustomers } from "@/client/hooks";
import { formatPhone } from "@/shared/format";
import { PAYMENT_METHOD, REPAIR_MODE } from "@/shared/domain/labels";
import { linesTotal } from "@/shared/domain/money";
import { normalizeMaliPhone } from "@/shared/phone";
import { repairIntakeSchema, type RepairIntakeInput } from "@/shared/schemas/staff";

const D = "/tableau-de-bord/reparations";
const BRANDS = ["Apple", "Samsung", "Tecno", "Infinix", "Itel", "Xiaomi", "Huawei", "Oppo", "Nokia", "Autre"];
const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }));

const defaults: RepairIntakeInput = {
  customerId: undefined,
  customerName: "",
  customerPhone: "",
  brand: "",
  model: "",
  color: "",
  imei: "",
  fault: "",
  conditionNotes: "",
  accessories: "",
  mode: "quote",
  lines: [],
  deposit: 0,
  depositMethod: "cash",
  estimatedReadyAt: "",
};

export default function NewRepairPage() {
  const router = useRouter();
  const create = useCreateRepair();
  const form = useAppForm({
    defaultValues: defaults,
    validators: { onSubmit: repairIntakeSchema },
    onSubmit: async ({ value }) => {
      const repair = await create.mutateAsync(value);
      router.push(`${D}/${repair.id}?nouveau=1`);
    },
  });

  return (
    <form onSubmit={onFormSubmit(form)} noValidate className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Nouvelle réparation"
        description="Enregistrez l'appareil au comptoir. Le ticket est imprimé ensuite."
        actions={
          <Button variant="ghost" render={<Link href={D} />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Retour
          </Button>
        }
      />

      {/* Customer */}
      <Section icon={UserIcon} title="Client" description="Choisissez un client existant, ou saisissez un nouveau numéro.">
        <form.Subscribe selector={(s) => s.values.customerId}>
          {(customerId) => (
            <ExistingCustomerPicker
              value={customerId ?? ""}
              onPick={(c) => {
                form.setFieldValue("customerId", c?.id);
                form.setFieldValue("customerName", c?.name ?? "");
                form.setFieldValue("customerPhone", c ? c.phone.replace(/^\+223/, "") : "");
              }}
            />
          )}
        </form.Subscribe>
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="customerPhone">{(f) => <f.PhoneField label="Téléphone" />}</form.AppField>
          <form.AppField name="customerName">{(f) => <f.TextField label="Nom complet" autoComplete="off" />}</form.AppField>
        </div>
        <form.Subscribe selector={(s) => ({ phone: s.values.customerPhone, id: s.values.customerId })}>
          {({ phone, id }) => (
            <CustomerMatch
              phone={phone}
              selectedId={id}
              onPick={(c) => {
                form.setFieldValue("customerId", c?.id);
                if (c) form.setFieldValue("customerName", c.name);
              }}
            />
          )}
        </form.Subscribe>
      </Section>

      {/* Device */}
      <Section icon={SmartphoneIcon} title="Appareil" description="Le code de déverrouillage n'est jamais enregistré : demandez-le au client si nécessaire.">
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="brand">
            {(f) => <f.SelectField label="Marque" options={BRANDS.map((b) => ({ value: b, label: b }))} />}
          </form.AppField>
          <form.AppField name="model">{(f) => <f.TextField label="Modèle" placeholder="Ex. Galaxy A14" />}</form.AppField>
          <form.AppField name="color">{(f) => <f.TextField label="Couleur (facultatif)" />}</form.AppField>
          <form.AppField name="imei">
            {(f) => <f.TextField label="IMEI / n° de série (facultatif)" inputMode="numeric" description="Pour identifier l'appareil uniquement." />}
          </form.AppField>
        </div>
        <form.AppField name="fault">
          {(f) => <f.TextareaField label="Panne décrite par le client" placeholder="Ex. écran cassé après une chute, tactile ne répond plus en bas" rows={3} />}
        </form.AppField>
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="conditionNotes">
            {(f) => <f.TextareaField label="État au dépôt" placeholder="Rayures, coque fissurée, bouton manquant…" rows={2} />}
          </form.AppField>
          <form.AppField name="accessories">
            {(f) => <f.TextareaField label="Accessoires laissés" placeholder="Coque, chargeur, carte SIM…" rows={2} />}
          </form.AppField>
        </div>
      </Section>

      {/* Mode + lines */}
      <Section icon={ClipboardListIcon} title="Prise en charge">
        <form.Field name="mode">
          {(field) => (
            <ToggleGroup
              value={[field.state.value]}
              onValueChange={(v) => v[0] && field.handleChange(v[0] as RepairIntakeInput["mode"])}
              variant="outline"
              className="grid w-full grid-cols-2"
            >
              {(Object.keys(REPAIR_MODE) as RepairIntakeInput["mode"][]).map((m) => (
                <ToggleGroupItem key={m} value={m} className="flex h-auto flex-col items-start gap-0.5 px-4 py-3 text-left whitespace-normal">
                  <span className="font-semibold">{REPAIR_MODE[m].label}</span>
                  <span className="text-xs font-normal text-muted-foreground">{REPAIR_MODE[m].description}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </form.Field>
        <form.Subscribe selector={(s) => s.values.mode}>
          {(mode) =>
            mode === "fixed" && (
              <form.Field name="lines">
                {(field) => {
                  const invalid = form.state.submissionAttempts > 0 && field.state.meta.errors.length > 0;
                  return (
                    <div className="flex flex-col gap-2">
                      <LinesEditor
                        value={field.state.value}
                        onChange={(v) => field.handleChange(v)}
                        sources={["service", "product"]}
                        productKinds={["part"]}
                        emptyLabel="Ajoutez la prestation et, si besoin, les pièces utilisées."
                        invalid={invalid}
                      />
                      {invalid && <FieldError errors={field.state.meta.errors as { message?: string }[]} />}
                    </div>
                  );
                }}
              </form.Field>
            )
          }
        </form.Subscribe>
        <form.AppField name="estimatedReadyAt">
          {(f) => <f.TextField label="Prêt estimé le (facultatif)" type="datetime-local" className="sm:max-w-xs" />}
        </form.AppField>
      </Section>

      {/* Deposit */}
      <Section icon={WalletIcon} title="Acompte" description="Facultatif. Le solde sera réglé à la récupération : aucun appareil ne sort avec un reste à payer.">
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="deposit">{(f) => <f.MoneyField label="Montant de l'acompte" />}</form.AppField>
          <form.AppField name="depositMethod">{(f) => <f.SelectField label="Moyen de paiement" options={PAYMENT_OPTIONS} />}</form.AppField>
        </div>
      </Section>

      <div className="glass sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:rounded-2xl md:border md:px-5">
        <form.Subscribe selector={(s) => ({ mode: s.values.mode, lines: s.values.lines })}>
          {({ mode, lines }) => (
            <p className="text-sm text-muted-foreground">
              {mode === "fixed" ? (
                <>
                  Total <span className="font-semibold text-foreground tabular-nums">{new Intl.NumberFormat("fr-ML").format(linesTotal(lines))} FCFA</span>
                </>
              ) : (
                "Le devis sera établi après diagnostic."
              )}
            </p>
          )}
        </form.Subscribe>
        <form.AppForm>
          <form.SubmitButton variant="brand" pendingLabel="Enregistrement…">
            Créer le ticket
          </form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/8 text-primary">
            <Icon className="size-4" />
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">{children}</FieldGroup>
      </CardContent>
    </Card>
  );
}

function ExistingCustomerPicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (c: { id: string; name: string; phone: string } | null) => void;
}) {
  const customers = useCustomers();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Client existant</span>
      <SearchSelect
        value={value}
        onValueChange={(id) => onPick(customers.data?.find((c) => c.id === id) ?? null)}
        aria-label="Client existant"
        placeholder="Rechercher un client par nom ou téléphone…"
        searchPlaceholder="Nom ou téléphone…"
        title="Client existant"
        noneOption={{ label: "Nouveau client", description: "Saisir le nom et le téléphone ci-dessous" }}
        loading={customers.isLoading}
        options={(customers.data ?? []).map((c) => ({
          value: c.id,
          label: c.name,
          description: formatPhone(c.phone),
          meta: c.repairsCount ? `${c.repairsCount} réparation${c.repairsCount > 1 ? "s" : ""}` : undefined,
          keywords: [c.phone, c.phone.slice(4)],
        }))}
      />
    </div>
  );
}

function CustomerMatch({
  phone,
  selectedId,
  onPick,
}: {
  phone: string;
  selectedId?: string;
  onPick: (c: { id: string; name: string } | null) => void;
}) {
  const normalized = normalizeMaliPhone(useDeferredValue(phone));
  const customers = useCustomers(normalized ? normalized.slice(4) : "__none__");
  const match = normalized ? customers.data?.find((c) => c.phone === normalized) : undefined;
  if (!match) return null;
  const selected = selectedId === match.id;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-info/8 px-4 py-3 text-sm">
      <p>
        <span className="font-medium">{match.name}</span> est déjà client ({formatPhone(match.phone)}, {match.repairsCount} réparation
        {match.repairsCount > 1 ? "s" : ""}).
      </p>
      <Button type="button" size="sm" variant={selected ? "secondary" : "default"} onClick={() => onPick(selected ? null : match)}>
        {selected ? "Client sélectionné" : "Utiliser ce client"}
      </Button>
    </div>
  );
}
