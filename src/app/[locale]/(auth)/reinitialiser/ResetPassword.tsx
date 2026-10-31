"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { hardNavigate } from "@/lib/hard-navigate";

export function ResetPassword() {
  const token = useSearchParams().get("jeton") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password !== String(data.get("confirm") ?? "")) return setError({ field: "confirm", text: "Les deux mots de passe ne sont pas identiques." });
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/password/reset", { body: { token, password } });
      hardNavigate("/accueil");
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "Le mot de passe n’a pas été changé. Réessayez." });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/connexion"
        title="Choisir un nouveau mot de passe"
        lead="Toutes vos sessions ouvertes seront fermées."
        footer={
          <Button type="submit" size="lg" block disabled={busy || !token}>
            {busy ? "Enregistrement…" : "Enregistrer et me connecter"}
          </Button>
        }
      >
        <TextField id="password" name="password" type="password" label="Nouveau mot de passe" autoComplete="new-password" hint="12 caractères au moins." error={fieldError("password")} />
        <TextField id="confirm" name="confirm" type="password" label="Confirmer le mot de passe" autoComplete="new-password" error={fieldError("confirm")} />
        {!token && <Alert tone="danger">Ce lien est incomplet. Ouvrez le lien reçu par e-mail en entier.</Alert>}
        {error && !error.field && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </AuthFrame>
    </form>
  );
}
