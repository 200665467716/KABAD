"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Alert } from "@/components/ui/Display";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { GithubMark } from "@/components/ui/Icon";
import { safeNext } from "@/lib/safe-next";
import { hardNavigate } from "@/lib/hard-navigate";

export function SignInForm({
  github,
  demo,
}: {
  github: boolean;
  demo: boolean;
}) {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        body: {
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        },
      });
      // A full load starts this member's session with nothing left from a previous one.
      hardNavigate(safeNext(params.get("suite")));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Connexion impossible. Réessayez.",
      );
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
          {params.get("erreur") === "github" && (
            <Alert tone="danger" role="alert">
              La connexion avec GitHub n’a pas abouti. Réessayez, ou
              connectez-vous avec votre e-mail.
            </Alert>
          )}
          {github && (
            <>
              <a
                href={`/api/auth/github?suite=${encodeURIComponent(safeNext(params.get("suite")))}`}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-md border-2 border-line-strong bg-raised px-5 font-bold text-ink no-underline hover:bg-sunken"
              >
                <GithubMark size={20} />
                Continuer avec GitHub
              </a>
              <p className="text-center text-sm text-muted">
                ou avec votre e-mail
              </p>
            </>
          )}
          <TextField
            id="email"
            name="email"
            type="email"
            label="Adresse e-mail"
            autoComplete="email"
            required
          />
          <TextField
            id="password"
            name="password"
            type="password"
            label="Mot de passe"
            autoComplete="current-password"
            required
          />
          <Link
            href="/mot-de-passe-oublie"
            className="justify-self-end text-sm font-bold text-brand-text"
          >
            Mot de passe oublié ?
          </Link>
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </Button>
        </div>
        {demo && (
          <details className="rounded-md bg-sunken px-4 py-3 text-sm">
            <summary className="cursor-pointer font-bold">
              Comptes de démonstration
            </summary>
            <p className="mt-2 text-muted">
              Mot de passe : kabad-demo-2026. Kossi : kossi.mensah@exemple.tg ·
              Moussa : moussa.traore@exemple.fr · Yao : yao.koffi@exemple.tg ·
              Awa (senior) : awa.diop@exemple.sn · Équipe : equipe@kabad.app.
              Ouvrez deux navigateurs pour voir les messages arriver en direct.
            </p>
          </details>
        )}
      </AuthFrame>
    </form>
  );
}
