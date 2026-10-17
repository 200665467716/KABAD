"use client";

import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, Stat } from "@/components/ui/Display";
import { member, pair } from "@/lib/data";
import { formatDuration, initials } from "@/lib/format";
import { usePairSessions } from "@/lib/use-pair";

export function SessionConfirm({ sessionId }: { sessionId: string }) {
  const { sessions, eligibility: total, confirm } = usePairSessions();
  const session = sessions.find((s) => s.id === sessionId)!;
  const mentor = member(pair.mentorId);
  const both = session.confirmedByMentor && session.confirmedByMentee;

  const rows = [
    { who: mentor.name, initials: initials(mentor.name), ok: session.confirmedByMentor, tone: "brand" as const },
    { who: "Vous", initials: "KM", ok: session.confirmedByMentee, tone: "accent" as const },
  ];

  return (
    <>
      <TopBar back="/mentorat" title={`Séance du ${session.longDate}`} subtitle={`Notée par ${member(session.notedBy).name}`} />
      <Page narrow className="flex-1">
        <Card className="grid-cols-3 gap-3 px-4 py-3.5">
          <Stat value={formatDuration(session.minutes)} label="durée" />
          <Stat value={session.start} label="début" />
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
            <p className="text-sm">{session.done}</p>
          </div>
          <hr className="border-line" />
          <div className="grid gap-1">
            <Overline>Prochaine étape</Overline>
            <p className="text-sm">{session.next}</p>
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
          {both ? (
            <Alert tone="success" title="Séance comptée.">
              Votre binôme totalise {formatDuration(total.confirmed)}
              {total.eligible ? " : vous pouvez participer aux défis à cagnotte." : `. Encore ${formatDuration(total.missing)} pour les défis à cagnotte.`}
            </Alert>
          ) : (
            <p className="text-xs text-muted">La séance compte quand vous l’avez confirmée tous les deux. Sans réponse, nous vous relançons après 48 h.</p>
          )}
        </div>
      </Page>
      <ActionBar className="grid-cols-[auto_minmax(0,1fr)]">
        <Button variant="secondary" disabled={both}>
          Corriger
        </Button>
        <Button variant="success" onClick={() => confirm(session.id)} disabled={session.confirmedByMentee} icon={session.confirmedByMentee ? "check" : undefined}>
          {session.confirmedByMentee ? "Séance confirmée" : "Je confirme la séance"}
        </Button>
      </ActionBar>
    </>
  );
}
