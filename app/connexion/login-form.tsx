"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { login } from "@/client/api";
import { loginSchema } from "@/shared/schemas/staff";
import { ROUTES } from "@/shared/site";

/**
 * UI only. Integration: replace `login()` with
 * `authClient.signIn.username({ username, password })` (lib/auth-client.ts).
 */
export function LoginForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const form = useAppForm({
    defaultValues: { username: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      try {
        const user = await login(value);
        try {
          localStorage.setItem("shalom.demoRole", user.role);
        } catch {}
        toast.success(`Bonjour ${user.name.split(" ")[0]} !`);
        router.push(ROUTES.dashboard);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Connexion impossible.");
      }
    },
  });

  return (
    <form onSubmit={onFormSubmit(form)} noValidate>
      <FieldGroup className="gap-5">
        <form.AppField name="username">
          {(f) => <f.TextField label="Identifiant" autoComplete="username" placeholder="ex. aissata" />}
        </form.AppField>
        <form.Field name="password">
          {(field) => {
            const invalid = field.state.meta.isTouched || form.state.submissionAttempts > 0 ? field.state.meta.errors.length > 0 : false;
            return (
              <Field data-invalid={invalid || undefined}>
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {show ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {invalid && <FieldError errors={field.state.meta.errors as { message?: string }[]} />}
              </Field>
            );
          }}
        </form.Field>
        <form.AppForm>
          <form.SubmitButton size="lg" className="w-full" pendingLabel="Connexion…">
            Se connecter
          </form.SubmitButton>
        </form.AppForm>
        <p className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
          Démo : identifiants <span className="font-mono">admin</span>, <span className="font-mono">aissata</span> ou{" "}
          <span className="font-mono">ibrahim</span>, avec n&apos;importe quel mot de passe de 4 caractères ou plus.
        </p>
      </FieldGroup>
    </form>
  );
}
