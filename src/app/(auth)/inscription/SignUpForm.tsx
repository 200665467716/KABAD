"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { GithubMark } from "@/components/ui/Icon";

type Errors = Partial<Record<"name" | "email" | "password" | "terms", string>>;

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Errors = {};
    if (String(data.get("name") ?? "").trim().length < 2) next.name = "Indiquez votre nom complet.";
    if (!/^\S+@\S+\.\S+$/.test(String(data.get("email") ?? ""))) next.email = "Cette adresse e-mail n’est pas valide.";
    if (String(data.get("password") ?? "").length < 12) next.password = "Le mot de passe doit faire au moins 12 caractères.";
    if (!data.get("terms")) next.terms = "Acceptez les conditions pour continuer.";
    setErrors(next);
    if (Object.keys(next).length === 0) router.push("/inscription/profil");
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
            <Button type="submit" size="lg" block>
              Continuer
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
        <div className="grid gap-2">
          <Button variant="secondary" block onClick={() => router.push("/inscription/profil")}>
            <span className="inline-flex items-center gap-2">
              <GithubMark />
              Continuer avec GitHub
            </span>
          </Button>
          <div className="my-2 flex items-center gap-3" aria-hidden="true">
            <hr className="flex-1 border-line" />
            <span className="text-xs font-bold text-subtle">OU AVEC VOTRE E-MAIL</span>
            <hr className="flex-1 border-line" />
          </div>
        </div>
        <div className="grid gap-4">
          <TextField id="name" name="name" label="Nom complet" autoComplete="name" defaultValue="Kossi Mensah" error={errors.name} />
          <TextField id="email" name="email" type="email" label="Adresse e-mail" autoComplete="email" defaultValue="kossi.mensah@exemple.tg" error={errors.email} />
          <TextField id="password" name="password" type="password" label="Mot de passe" autoComplete="new-password" hint="12 caractères minimum." error={errors.password} />
          <div className="grid gap-1">
            <Checkbox name="terms" defaultChecked>
              J’accepte les <a href="#" className="text-brand-text">conditions d’utilisation</a> et la <a href="#" className="text-brand-text">charte de la communauté</a>.
            </Checkbox>
            {errors.terms && <span className="text-sm font-bold text-danger">{errors.terms}</span>}
          </div>
        </div>
      </AuthFrame>
    </form>
  );
}
