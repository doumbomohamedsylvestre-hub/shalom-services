"use client";

import { CircleCheckIcon } from "lucide-react";
import { useState } from "react";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSubmitInquiry } from "@/client/hooks";
import { inquirySchema, type InquiryInput } from "@/shared/schemas/public";

const TYPES: { value: InquiryInput["type"]; label: string }[] = [
  { value: "quote", label: "Devis" },
  { value: "repair", label: "Réparation" },
  { value: "contact", label: "Question" },
];

/**
 * Public inquiry form (repair / quote / contact). Submits to the inbox via
 * useSubmitInquiry; the hidden "website" field is the anti-spam honeypot.
 */
export function InquiryForm({ defaultType = "quote", showTypePicker = true }: { defaultType?: InquiryInput["type"]; showTypePicker?: boolean }) {
  const submit = useSubmitInquiry();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { type: defaultType, name: "", phone: "", device: "", message: "", website: "" } as InquiryInput,
    validators: { onSubmit: inquirySchema },
    onSubmit: async ({ value }) => {
      await submit.mutateAsync(value);
      setSentTo(value.name.split(" ")[0] ?? value.name);
      form.reset();
    },
  });

  if (sentTo) {
    return (
      <div className="flex animate-in flex-col items-center gap-4 rounded-3xl bg-success/8 px-6 py-12 text-center duration-300 fade-in zoom-in-95">
        <span className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <CircleCheckIcon className="size-7" />
        </span>
        <h3 className="text-xl font-semibold">Merci {sentTo}, c&apos;est bien reçu.</h3>
        <p className="max-w-sm text-muted-foreground">
          Nous vous rappelons ou vous écrivons sur WhatsApp très vite, généralement dans l&apos;heure pendant nos horaires
          d&apos;ouverture.
        </p>
        <Button variant="outline" onClick={() => setSentTo(null)}>
          Envoyer une autre demande
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onFormSubmit(form)} noValidate>
      <FieldGroup className="gap-5">
        {showTypePicker && (
          <form.Field name="type">
            {(field) => (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Votre demande concerne</span>
                <ToggleGroup
                  value={[field.state.value]}
                  onValueChange={(v) => v[0] && field.handleChange(v[0] as InquiryInput["type"])}
                  variant="outline"
                  className="w-full *:flex-1"
                >
                  {TYPES.map((t) => (
                    <ToggleGroupItem key={t.value} value={t.value} className="h-11 md:h-9">
                      {t.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </form.Field>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <form.AppField name="name">
            {(f) => <f.TextField label="Nom complet" autoComplete="name" placeholder="Awa Traoré" />}
          </form.AppField>
          <form.AppField name="phone">
            {(f) => <f.PhoneField label="Téléphone (WhatsApp)" />}
          </form.AppField>
        </div>
        <form.Subscribe selector={(s) => s.values.type}>
          {(type) =>
            type !== "contact" && (
              <form.AppField name="device">
                {(f) => <f.TextField label="Appareil" placeholder="Ex. iPhone 12, Samsung A14…" />}
              </form.AppField>
            )
          }
        </form.Subscribe>
        <form.AppField name="message">
          {(f) => (
            <f.TextareaField
              label="Votre message"
              placeholder="Décrivez la panne : écran cassé, ne charge plus, chute dans l'eau…"
              rows={5}
            />
          )}
        </form.AppField>
        {/* Honeypot: invisible to people, filled by bots. */}
        <form.Field name="website">
          {(field) => (
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              value={field.state.value ?? ""}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>
        <form.AppForm>
          <form.SubmitButton variant="brand" size="lg" className="w-full sm:w-auto" pendingLabel="Envoi…">
            Envoyer ma demande
          </form.SubmitButton>
        </form.AppForm>
        <p className="text-xs text-muted-foreground">
          Vos coordonnées servent uniquement à vous répondre au sujet de cette demande.
        </p>
      </FieldGroup>
    </form>
  );
}
