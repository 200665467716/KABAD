"use client";

import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import { MENTOR_TOPICS } from "@/lib/schemas";
import type { Profile } from "@/lib/domain-types";

export function RequestForm({ mentor: m }: { mentor: Profile }) {
  const first = m.name.split(" ")[0];
  const [topics, setTopics] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const full = m.openSlots === 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/mentoring/requests", {
        body: { mentorId: m.id, project: String(data.get("project") ?? ""), situation: String(data.get("where") ?? ""), repo: String(data.get("repo") ?? ""), topics },
      });
      setSent(true);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : "La demande n’a pas été envoyée. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={`/profil/${m.id}`} close title="Demande de mentorat" />
      <Page narrow className="flex-1">
        <PersonRow
          className="rounded-lg border-2 border-line-strong bg-raised p-3"
          avatar={<Avatar initials={initials(m.name)} />}
          name={m.name}
          badge={<Badge tone="brand">Senior</Badge>}
          meta={m.replyTime || `${m.city} · ${m.years} ans`}
        />
        {sent ? (
          <Alert tone="success" role="status" title="Demande envoyée.">
            {first} reçoit votre demande et vous répond ici. Sans réponse sous 72 h, choisissez un autre mentor.
          </Alert>
        ) : full ? (
          <Alert tone="info" title={`${first} n’a plus de place libre.`}>
            Choisissez un autre mentor disponible, ou revenez plus tard.
          </Alert>
        ) : (
          <>
            <TextField id="project" name="project" label="Sur quel projet voulez-vous travailler ?" placeholder="Par exemple : API de paiement mobile money" error={fieldError("project")} />
            <TextArea id="where" name="where" label="Où en êtes-vous ?" rows={4} placeholder="Ce qui marche déjà, ce qui vous bloque, ce que vous voulez apprendre." error={fieldError("situation")} />
            <TextField id="repo" name="repo" label="Lien du dépôt (facultatif)" placeholder="github.com/vous/projet" inputClassName="font-mono text-[15px]" error={fieldError("repo")} />
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-bold">Ce que vous voulez apprendre</legend>
              <div className="flex flex-wrap gap-2">
                {MENTOR_TOPICS.map((t) => (
                  <ToggleChip key={t} pressed={topics.includes(t)} onClick={() => setTopics((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>
                    {t}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            {error && !error.field && (
              <Alert tone="danger" role="alert">
                {error.text}
              </Alert>
            )}
            <Alert tone="info">Pas de durée imposée : vous fixez le rythme à deux. Sans réponse sous 72 h, choisissez un autre mentor.</Alert>
          </>
        )}
      </Page>
      <ActionBar>
        {sent || full ? (
          <ButtonLink href={full ? "/mentorat/mentors" : "/mentorat"} size="lg" block>
            {full ? "Voir les mentors disponibles" : "Retour au mentorat"}
          </ButtonLink>
        ) : (
          <Button type="submit" size="lg" block disabled={busy}>
            {busy ? "Envoi…" : "Envoyer la demande"}
          </Button>
        )}
      </ActionBar>
    </form>
  );
}
