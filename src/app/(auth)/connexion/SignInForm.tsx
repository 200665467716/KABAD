"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { GithubMark } from "@/components/ui/Icon";

const MAX_TRIES = 5;

export function SignInForm() {
  const router = useRouter();
  const [failures, setFailures] = useState(0);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Example account until authentication is wired in.
    if (data.get("email") === "kossi.mensah@exemple.tg" && data.get("password") === "kabad-demo-2026") {
      router.push("/accueil");
      return;
    }
    setFailures((f) => f + 1);
  }

  const left = MAX_TRIES - failures;
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
          <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" defaultValue="kossi.mensah@exemple.tg" />
          <div className="grid gap-1">
            <TextField
              id="password"
              name="password"
              type="password"
              label="Mot de passe"
              autoComplete="current-password"
              hint="Compte de démonstration : kabad-demo-2026"
              error={failures > 0 ? (left > 0 ? `E-mail ou mot de passe incorrect. Il vous reste ${left} essai${left > 1 ? "s" : ""}.` : "Trop d’essais. Réessayez dans 15 minutes ou recevez un lien de connexion.") : undefined}
            />
            <Link href="#" className="justify-self-end text-sm font-bold text-brand-text">
              Mot de passe oublié ?
            </Link>
          </div>
          <Button type="submit" size="lg" block disabled={left <= 0}>
            Se connecter
          </Button>
        </div>
        <div className="flex items-center gap-3" aria-hidden="true">
          <hr className="flex-1 border-line" />
          <span className="text-xs font-bold text-subtle">OU</span>
          <hr className="flex-1 border-line" />
        </div>
        <div className="grid gap-2">
          <Button variant="secondary" block onClick={() => router.push("/accueil")}>
            <span className="inline-flex items-center gap-2">
              <GithubMark />
              Continuer avec GitHub
            </span>
          </Button>
          <Button variant="ghost" block icon="mail">
            Recevoir un lien de connexion
          </Button>
        </div>
      </AuthFrame>
    </form>
  );
}
