"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Alert } from "@/components/ui/Display";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";

/** Only same-site paths are accepted as a destination after sign-in. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/accueil";
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { body: { email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") } });
      router.replace(safeNext(params.get("suite")));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible. Réessayez.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <AuthFrame
        back="/"
        title="Bon retour parmi nous"
        lead="Connectez-vous pour retrouver votre binôme, vos défis et vos conversations."
        footer={
          <p className="text-center text-sm text-muted">
            Nouveau sur KABAD ?{" "}
            <Link href="/inscription" className="font-bold text-brand-text">
              Créer un compte
            </Link>
          </p>
        }
      >
        <div className="grid gap-4">
          <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" defaultValue="kossi.mensah@exemple.tg" required />
          <TextField id="password" name="password" type="password" label="Mot de passe" autoComplete="current-password" hint="Comptes de démonstration : mot de passe kabad-demo-2026" required />
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </Button>
        </div>
        <details className="rounded-md bg-sunken px-4 py-3 text-sm">
          <summary className="cursor-pointer font-bold">Comptes de démonstration</summary>
          <p className="mt-2 text-muted">
            Kossi : kossi.mensah@exemple.tg · Moussa : moussa.traore@exemple.fr · Yao : yao.koffi@exemple.tg · Chidi : chidi.okafor@exemple.ng. Ouvrez deux navigateurs pour voir les messages arriver en direct.
          </p>
        </details>
      </AuthFrame>
    </form>
  );
}
