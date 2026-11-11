"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { onFormSubmit, useAppForm } from "@/components/form/form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/shared/schemas/staff";
import { ROUTES } from "@/shared/site";

/** Only send people back to staff pages after login (no open redirects). */
function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return ROUTES.dashboard;
  return next.startsWith(ROUTES.dashboard) || next.startsWith("/impression/") ? next : ROUTES.dashboard;
}

function loginErrorMessage(error: { status?: number; code?: string }) {
  if (error.status === 429) return "Trop de tentatives. Patientez une minute puis réessayez.";
  if (error.code === "BANNED_USER") return "Ce compte a été désactivé. Contactez l'administrateur.";
  if (error.status === 401 || error.status === 422 || error.code === "INVALID_USERNAME_OR_PASSWORD") {
    return "Identifiant ou mot de passe incorrect.";
  }
  if (!error.status) return "Connexion impossible. Vérifiez votre accès à Internet.";
  return "Connexion impossible. Réessayez.";
}

/** Staff login by username (Better Auth username plugin). */
export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [show, setShow] = useState(false);
  const form = useAppForm({
    defaultValues: { username: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      const { data, error } = await authClient.signIn.username({
        username: value.username.trim().toLowerCase(),
        password: value.password,
      });
      if (error || !data) {
        form.setFieldValue("password", "");
        toast.error(loginErrorMessage(error ?? {}));
        return;
      }
      toast.success(`Bonjour ${data.user.name.split(" ")[0]} !`);
      router.replace(next);
      router.refresh();
    },
  });

  return (
    <form onSubmit={onFormSubmit(form)} noValidate>
      <FieldGroup className="gap-5">
        <form.AppField name="username">
          {(f) => (
            <f.TextField
              label="Identifiant"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ex. aissata"
            />
          )}
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
      </FieldGroup>
    </form>
  );
}
