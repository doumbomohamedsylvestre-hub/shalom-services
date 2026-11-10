"use client";

/**
 * App form kit: TanStack Form + Zod, rendered with shadcn Field primitives.
 *
 *   const form = useAppForm({ defaultValues, validators: { onSubmit: schema }, onSubmit })
 *   <form.AppField name="phone">{(f) => <f.PhoneField label="Téléphone" />}</form.AppField>
 *   <form.AppForm><form.SubmitButton>Envoyer</form.SubmitButton></form.AppForm>
 *
 * Errors show inline under each field (French messages from the schemas).
 */
import { createFormHook, createFormHookContexts, useStore } from "@tanstack/react-form";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect, type SearchSelectOption } from "@/components/search-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

type BaseProps = {
  label: string;
  description?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
};

function useFieldState() {
  const field = useFieldContext<unknown>();
  const errors = useStore(field.store, (s) => s.meta.errors) as Array<{ message?: string } | string | undefined>;
  const touched = useStore(field.store, (s) => s.meta.isTouched);
  const submitted = useStore(field.form.store, (s) => s.submissionAttempts > 0);
  const shown = touched || submitted ? errors.map((e) => (typeof e === "string" ? { message: e } : e)) : [];
  return { field, errors: shown, invalid: shown.length > 0 };
}

function Shell({
  label,
  description,
  className,
  hideLabel,
  id,
  errors,
  invalid,
  children,
}: BaseProps & { id: string; errors: Array<{ message?: string } | undefined>; invalid: boolean; children: React.ReactNode }) {
  return (
    <Field data-invalid={invalid || undefined} className={className}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {label}
      </FieldLabel>
      {children}
      {description && !invalid && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  );
}

function TextField({
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  ...base
}: BaseProps & {
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const { field, errors, invalid } = useFieldState();
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={(field.state.value as string) ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={invalid}
      />
    </Shell>
  );
}

function TextareaField({ placeholder, rows = 4, ...base }: BaseProps & { placeholder?: string; rows?: number }) {
  const { field, errors, invalid } = useFieldState();
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <Textarea
        id={field.name}
        name={field.name}
        rows={rows}
        placeholder={placeholder}
        value={(field.state.value as string) ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={invalid}
        className="min-h-24 resize-none"
      />
    </Shell>
  );
}

function PhoneField({ placeholder = "70 12 34 56", ...base }: BaseProps & { placeholder?: string }) {
  const { field, errors, invalid } = useFieldState();
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>+223</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={field.name}
          name={field.name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          value={(field.state.value as string) ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={invalid}
        />
      </InputGroup>
    </Shell>
  );
}

function NumberField({ suffix, min = 0, ...base }: BaseProps & { suffix?: string; min?: number }) {
  const { field, errors, invalid } = useFieldState();
  const value = field.state.value as number | null;
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <InputGroup>
        <InputGroupInput
          id={field.name}
          name={field.name}
          type="number"
          inputMode="numeric"
          min={min}
          step={1}
          value={value ?? ""}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value === "" ? (null as never) : Number(e.target.value))}
          aria-invalid={invalid}
          className="tabular-nums"
        />
        {suffix && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </Shell>
  );
}

function MoneyField(props: BaseProps) {
  return <NumberField {...props} suffix="FCFA" />;
}

type Option = { label: string; value: string };

function SelectField({ options, placeholder = "Choisir…", ...base }: BaseProps & { options: Option[]; placeholder?: string }) {
  const { field, errors, invalid } = useFieldState();
  const items = [{ label: placeholder, value: null as string | null }, ...options];
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <Select
        items={items}
        value={(field.state.value as string) || null}
        onValueChange={(v) => field.handleChange((v ?? "") as never)}
      >
        <SelectTrigger id={field.name} className="w-full" aria-invalid={invalid} onBlur={field.handleBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  );
}

/** Searchable select for long lists (products, customers, suppliers). */
function SearchSelectField({
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  noneOption,
  loading,
  ...base
}: BaseProps & {
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noneOption?: { label: string; description?: string };
  loading?: boolean;
}) {
  const { field, errors, invalid } = useFieldState();
  return (
    <Shell {...base} id={field.name} errors={errors} invalid={invalid}>
      <SearchSelect
        id={field.name}
        value={(field.state.value as string) ?? ""}
        onValueChange={(v) => field.handleChange(v as never)}
        onBlur={field.handleBlur}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        noneOption={noneOption}
        loading={loading}
        invalid={invalid}
        title={base.label}
      />
    </Shell>
  );
}

function SwitchField({ label, description, className }: BaseProps) {
  const field = useFieldContext<boolean>();
  return (
    <Field orientation="horizontal" className={cn("items-center justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </div>
      <Switch id={field.name} checked={field.state.value} onCheckedChange={(v) => field.handleChange(v)} />
    </Field>
  );
}

function SubmitButton({
  children,
  className,
  variant = "default",
  size = "default",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  pendingLabel?: string;
}) {
  const form = useFormContext();
  const submitting = useStore(form.store, (s) => s.isSubmitting);
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={submitting}>
      {submitting && <Spinner data-icon="inline-start" />}
      {submitting ? (pendingLabel ?? children) : children}
    </Button>
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField, PhoneField, NumberField, MoneyField, SelectField, SearchSelectField, SwitchField },
  formComponents: { SubmitButton },
});

/** Prevents the native submit and hands control to TanStack Form. */
export function onFormSubmit(form: { handleSubmit: () => Promise<void> | void }) {
  return (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void form.handleSubmit();
  };
}
