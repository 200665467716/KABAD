"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Alert } from "@/components/ui/Display";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { signupSchema } from "@/lib/schemas";

type Errors = Partial<Record<"name" | "email" | "password" | "terms" | "form", string>>;

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") };
    const next: Errors = {};
    const parsed = signupSchema.safeParse(input);
    if (!parsed.success) for (const issue of parsed.error.issues) next[issue.path[0] as keyof Errors] ??= issue.message;
    if (!data.get("terms")) next.terms = "Acceptez les conditions pour continuer.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await api("/api/auth/signup", { body: input });
      router.push("/inscription/profil");
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : "Le compte n’a pas été créé. Réessayez." });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/"
        step={1}
        title="Créez votre compte"
        lead="Quelques informations pour commencer. Vous compléterez votre profil juste après."
        footer={
          <>
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? "Création du compte…" : "Continuer"}
            </Button>
            <p className="text-center text-sm text-muted">
              Déjà membre ?{" "}
              <Link href="/connexion" className="font-bold text-brand-text">
                Se connecter
              </Link>
            </p>
          </>
        }
      >
        <div className="grid gap-4">
          <TextField id="name" name="name" label="Nom complet" autoComplete="name" error={errors.name} />
          <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" error={errors.email} />
          <TextField id="password" name="password" type="password" label="Mot de passe" autoComplete="new-password" hint="12 caractères minimum." error={errors.password} />
          <div className="grid gap-1">
            <Checkbox name="terms">
              J’accepte les{" "}
              <a href="/conditions" target="_blank" className="text-brand-text">
                conditions d’utilisation et la charte de la communauté
              </a>
              .
            </Checkbox>
            {errors.terms && <span className="text-sm font-bold text-danger">{errors.terms}</span>}
          </div>
          {errors.form && (
            <Alert tone="danger" role="alert">
              {errors.form}
            </Alert>
          )}
        </div>
      </AuthFrame>
    </form>
  );
}
