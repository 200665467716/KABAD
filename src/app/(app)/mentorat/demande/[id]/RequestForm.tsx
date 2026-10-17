"use client";

import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert, Avatar, Badge, PersonRow } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { member } from "@/lib/data";
import { initials } from "@/lib/format";

const TOPICS = ["Tests", "Webhooks", "Architecture", "Déploiement", "Revue de code"];

export function RequestForm({ mentorId }: { mentorId: string }) {
  const m = member(mentorId);
  const first = m.name.split(" ")[0];
  const [topics, setTopics] = useState<string[]>(["Tests", "Webhooks"]);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (String(data.get("project") ?? "").trim().length < 3) return setError("Indiquez le projet sur lequel vous voulez travailler.");
    setError(null);
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <TopBar back={`/profil/${m.id}`} close title="Demande de mentorat" />
      <Page narrow className="flex-1">
        <PersonRow
          className="rounded-lg border border-line bg-raised p-3"
          avatar={<Avatar initials={initials(m.name)} />}
          name={m.name}
          badge={<Badge tone="brand">Senior</Badge>}
          meta={m.replyTime ?? `${m.city} · ${m.years} ans`}
        />
        {sent ? (
          <Alert tone="success" role="status" title="Demande envoyée.">
            {first} reçoit votre demande et vous répond ici. Sans réponse sous 72 h, nous vous proposerons un autre mentor.
          </Alert>
        ) : (
          <>
            <TextField id="project" name="project" label="Sur quel projet voulez-vous travailler ?" defaultValue="API de paiement mobile money" error={error} />
            <TextArea
              id="where"
              name="where"
              label="Où en êtes-vous ?"
              rows={4}
              defaultValue="J’ai une API Express qui reçoit les paiements, mais je ne sais pas gérer les webhooks en double ni écrire les tests. Je veux la rendre fiable avant le défi."
            />
            <TextField id="repo" name="repo" label="Lien du dépôt (facultatif)" defaultValue="github.com/kmensah/momo-api" inputClassName="font-mono text-[15px]" />
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-bold">Ce que vous voulez apprendre</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <ToggleChip key={t} pressed={topics.includes(t)} onClick={() => setTopics((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))}>
                    {t}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            <Alert tone="info">Pas de durée imposée : vous fixez le rythme à deux. Sans réponse sous 72 h, nous vous proposons un autre mentor.</Alert>
          </>
        )}
      </Page>
      <ActionBar>
        {sent ? (
          <ButtonLink href="/mentorat" size="lg" block>
            Retour au mentorat
          </ButtonLink>
        ) : (
          <Button type="submit" size="lg" block>
            Envoyer la demande
          </Button>
        )}
      </ActionBar>
    </form>
  );
}
