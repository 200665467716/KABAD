"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, Stat } from "@/components/ui/Display";
import { api, ApiError } from "@/lib/api";
import { formatDuration, initials } from "@/lib/format";
import { hourLabel, longDate } from "@/lib/time";
import type { Eligibility, PairView, SessionView } from "@/lib/domain-types";
import { SessionForm } from "../SessionForm";

export function SessionConfirm({ session, pair, eligibility: total }: { session: SessionView; pair: PairView; eligibility: Eligibility | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const both = session.confirmedByMentor && session.confirmedByMentee;
  const mine = pair.iAm === "MENTOR" ? session.confirmedByMentor : session.confirmedByMentee;

  if (editing) return <SessionForm pairId={pair.id} project={pair.project} session={session} onCancel={() => setEditing(false)} />;

  const rows = [
    { who: pair.iAm === "MENTOR" ? "Vous" : pair.mentor.name, initials: initials(pair.mentor.name), ok: session.confirmedByMentor, tone: "brand" as const },
    { who: pair.iAm === "MENTEE" ? "Vous" : pair.mentee.name, initials: initials(pair.mentee.name), ok: session.confirmedByMentee, tone: "accent" as const },
  ];

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/sessions/${session.id}/confirm`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La confirmation n’a pas été enregistrée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar back="/mentorat" title={`Séance du ${longDate(session.startsAt)}`} subtitle={`Notée par ${session.notedBy.name}`} />
      <Page narrow className="flex-1">
        <Card className="grid-cols-3 gap-3 px-4 py-3.5">
          <Stat value={formatDuration(session.minutes)} label="durée" />
          <Stat value={hourLabel(session.startsAt)} label="début" />
          <Stat value="Visio" label="écran partagé" />
        </Card>
        <Card className="gap-3">
          <div className="grid gap-1">
            <Overline>Sujet</Overline>
            <p className="font-bold">{session.topic}</p>
          </div>
          <hr className="border-line" />
          <div className="grid gap-1">
            <Overline>Ce que nous avons fait</Overline>
            <p className="text-sm whitespace-pre-line">{session.done}</p>
          </div>
          <hr className="border-line" />
          <div className="grid gap-1">
            <Overline>Prochaine étape</Overline>
            <p className="text-sm whitespace-pre-line">{session.next}</p>
          </div>
        </Card>
        <section className="grid gap-2" aria-labelledby="confirm">
          <Overline as="h2" id="confirm">
            Confirmations
          </Overline>
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised px-4 py-1">
            {rows.map((r) => (
              <li key={r.who} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                <Avatar initials={r.initials} size="sm" tone={r.tone} />
                <span className="text-sm font-bold">{r.who}</span>
                {r.ok ? <Badge tone="success">Confirmé</Badge> : <Badge tone="accent">En attente</Badge>}
              </li>
            ))}
          </ul>
        </section>
        <div aria-live="polite">
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
          {both ? (
            <Alert tone="success" title="Séance comptée.">
              {total
                ? `Vous totalisez ${formatDuration(total.confirmed)} de mentorat confirmé${total.eligible ? " : vous pouvez participer aux défis à cagnotte." : `. Encore ${formatDuration(total.missing)} pour les défis à cagnotte.`}`
                : `Votre binôme totalise ${formatDuration(pair.confirmedMinutes)} confirmées.`}
            </Alert>
          ) : (
            <p className="text-xs text-muted">La séance compte quand vous l’avez confirmée tous les deux. Une correction demande à l’autre de confirmer à nouveau.</p>
          )}
        </div>
      </Page>
      <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
        <Button variant="secondary" disabled={both} onClick={() => setEditing(true)}>
          Corriger
        </Button>
        <Button variant="success" onClick={confirm} disabled={mine || busy} icon={mine ? "check" : undefined}>
          {mine ? "Séance confirmée" : busy ? "Confirmation…" : "Je confirme la séance"}
        </Button>
      </ActionBar>
    </>
  );
}
