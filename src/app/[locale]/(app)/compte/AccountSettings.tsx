"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Page } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, Card, Overline } from "@/components/ui/Display";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { disconnectRealtime } from "@/lib/realtime-client";
import { hardNavigate } from "@/lib/hard-navigate";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <Overline as="h2">{title}</Overline>
      <Card className="gap-3">{children}</Card>
    </section>
  );
}

type Blocked = { id: string; name: string; city: string; since: string };

export function AccountSettings({ email, hasPassword, github, verified, profileId, blocked }: { email: string; hasPassword: boolean; github: string | null; verified: boolean; profileId: string; blocked: Blocked[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ key: string; tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, call: () => Promise<unknown>, ok: string, after?: () => void) {
    setBusy(key);
    setMsg(null);
    try {
      await call();
      setMsg({ key, tone: "success", text: ok });
      after?.();
    } catch (e) {
      setMsg({ key, tone: "danger", text: e instanceof ApiError ? e.message : "L’action n’a pas abouti. Réessayez." });
    } finally {
      setBusy(null);
    }
  }
  const note = (key: string) =>
    msg?.key === key && (
      <Alert tone={msg.tone} role={msg.tone === "danger" ? "alert" : "status"}>
        {msg.text}
      </Alert>
    );

  function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    run("password", () => api("/api/me/password", { body: { current: String(data.get("current") ?? ""), next: String(data.get("next") ?? "") } }), "Mot de passe changé. Vos autres appareils sont déconnectés.", () => form.reset());
  }

  function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    run("delete", () => api("/api/me", { method: "DELETE", body: { password: String(data.get("password") ?? "") || undefined, confirm: String(data.get("confirm") ?? "") } }), "Compte supprimé.", () => {
      disconnectRealtime();
      hardNavigate("/");
    });
  }

  return (
    <Page narrow>
      <Section title="Adresse e-mail">
        <p className="text-sm">
          <b>{email}</b> · {verified ? "confirmée" : "pas encore confirmée"}
        </p>
        {!verified && (
          <>
            <Button variant="secondary" size="sm" className="justify-self-start" disabled={busy !== null} onClick={() => run("verify", () => api("/api/auth/verify/resend", { method: "POST" }), "E-mail envoyé. Ouvrez le lien qu’il contient.")}>
              Renvoyer l’e-mail de confirmation
            </Button>
            {note("verify")}
          </>
        )}
        {github && <p className="text-sm text-muted">Compte GitHub lié : {github}</p>}
      </Section>

      <Section title={hasPassword ? "Changer de mot de passe" : "Choisir un mot de passe"}>
        <form onSubmit={changePassword} className="grid gap-3" noValidate>
          {hasPassword && <TextField id="current" name="current" type="password" label="Mot de passe actuel" autoComplete="current-password" />}
          <TextField id="next" name="next" type="password" label="Nouveau mot de passe" autoComplete="new-password" hint="12 caractères au moins." />
          <Button type="submit" size="sm" className="justify-self-start" disabled={busy !== null}>
            Enregistrer
          </Button>
          {note("password")}
        </form>
      </Section>

      <Section title="Sessions">
        <p className="text-sm text-muted">Un téléphone perdu ou un ordinateur partagé ? Déconnectez tous vos appareils, y compris celui-ci.</p>
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          disabled={busy !== null}
          onClick={() =>
            run("sessions", () => api("/api/auth/logout-all", { method: "POST" }), "Tous vos appareils sont déconnectés.", () => {
              disconnectRealtime();
              hardNavigate("/connexion");
            })
          }
        >
          Déconnecter tous mes appareils
        </Button>
        {note("sessions")}
      </Section>

      <Section title="Membres bloqués">
        {blocked.length === 0 ? (
          <p className="text-sm text-muted">Vous n’avez bloqué personne.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {blocked.map((b) => (
              <li key={b.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <Avatar initials={initials(b.name)} size="sm" />
                <Link href={`/profil/${b.id}`} className="text-sm font-bold text-ink no-underline">
                  {b.name}
                </Link>
                <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run("blocks", () => api(`/api/blocks/${b.id}`, { method: "DELETE" }), `${b.name} est débloqué.`, () => router.refresh())}>
                  Débloquer
                </Button>
              </li>
            ))}
          </ul>
        )}
        {note("blocks")}
      </Section>

      <Section title="Mes données">
        <p className="text-sm text-muted">Téléchargez tout ce que vous avez écrit ou déclaré sur KABAD, dans un fichier JSON.</p>
        <ButtonLink href="/api/me/export" variant="secondary" size="sm" className="justify-self-start" download>
          Télécharger mes données
        </ButtonLink>
        <ButtonLink href={`/profil/${profileId}`} variant="ghost" size="sm" className="justify-self-start">
          Voir mon profil public
        </ButtonLink>
      </Section>

      <Section title="Supprimer mon compte">
        <form onSubmit={deleteAccount} className="grid gap-3" noValidate>
          <p className="text-sm text-muted">Définitif. Vos messages restent chez vos correspondants, sans votre nom. Votre profil, vos binômes, vos solutions et vos rapports sont effacés.</p>
          {hasPassword && <TextField id="del-password" name="password" type="password" label="Votre mot de passe" autoComplete="current-password" />}
          <TextField id="confirm" name="confirm" label="Écrivez SUPPRIMER pour confirmer" autoComplete="off" />
          <Button type="submit" variant="danger" size="sm" className="justify-self-start" disabled={busy !== null}>
            Supprimer définitivement
          </Button>
          {note("delete")}
        </form>
      </Section>
    </Page>
  );
}
