"use client";

import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password/forgot", { body: { email: String(new FormData(e.currentTarget).get("email") ?? "") } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "La demande n’est pas partie. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/connexion"
        title="Mot de passe oublié"
        lead="Indiquez l’adresse de votre compte. Nous vous envoyons un lien pour choisir un nouveau mot de passe."
        footer={
          <Button type="submit" size="lg" block disabled={busy || sent}>
            {busy ? "Envoi…" : "Envoyer le lien"}
          </Button>
        }
      >
        <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" required />
        {sent && (
          <Alert tone="success" role="status" title="C’est parti.">
            Si un compte existe avec cette adresse, un e-mail arrive dans quelques minutes. Pensez à regarder dans les indésirables.
          </Alert>
        )}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
