import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Overline, PrizeSplit } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatFCFA, initials } from "@/lib/format";
import { longDate } from "@/lib/time";
import { CONTEST_HOURS, getResults, myFeedback } from "@/server/challenges";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export const metadata: Metadata = { title: "Résultats" };

const hasPassed = (iso: string) => new Date(iso).getTime() <= Date.now();

async function ResultsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/defis/${id}/resultats`);
  const c = await orNotFound(getResults(id));
  if (!c) notFound();
  const feedback = await myFeedback(user.id, id);
  const top = c.ranking[0];
  const iWon = top?.userId === user.id;
  const winnerPayout = c.payouts.find((p) => p.role === "WINNER");
  const mentorPayout = c.payouts.find((p) => p.role === "MENTOR");
  const published = c.publishedAt ?? c.closesAt;
  const contestEnds = new Date(new Date(published).getTime() + CONTEST_HOURS * 3600_000).toISOString();
  const steps = [
    { label: "Résultats publiés", when: longDate(published), done: true },
    { label: `Délai de contestation de ${CONTEST_HOURS} h écoulé`, when: longDate(contestEnds), done: hasPassed(contestEnds) },
    winnerPayout?.status === "SENT"
      ? { label: `Envoyé sur ${winnerPayout.operator ?? "Mobile Money"} ${winnerPayout.phone ?? ""}`.trim(), when: `${longDate(winnerPayout.sentAt!)} · réf. ${winnerPayout.reference}`, mono: true, done: true }
      : { label: "Envoi sur Mobile Money", when: "En attente", done: false },
  ];

  return (
    <>
      <TopBar back="/defis" title={c.title} subtitle={`Terminé le ${longDate(c.closesAt)} · ${c.participants} solution${c.participants > 1 ? "s" : ""}`} />
      <Page narrow>
        {iWon && (
          <section className="grid gap-1.5 rounded-lg bg-accent p-4 text-on-accent">
            <p className="text-xs font-bold tracking-[0.08em] uppercase">Vous avez gagné</p>
            <p className="font-celebrate text-[34px] font-extrabold tracking-[-0.03em] leading-10 tabular">{c.kind === "LOT" ? c.prizeLabel : formatFCFA(winnerPayout?.amount ?? 0)}</p>
            <p className="text-sm">
              Note moyenne du jury : {top.mark.toLocaleString("fr-FR")} sur 20. Bravo {top.name.split(" ")[0]}.
            </p>
          </section>
        )}

        {feedback && (
          <section className="grid gap-2" aria-labelledby="feedback">
            <Overline as="h2" id="feedback">
              Votre note : {feedback.mark.toLocaleString("fr-FR")} sur 20
            </Overline>
            {feedback.comments.length > 0 ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {feedback.comments.map((comment, i) => (
                  <li key={i} className="rounded-md bg-sunken px-3.5 py-3 text-sm">
                    « {comment} »
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Le jury n’a pas laissé de commentaire.</p>
            )}
          </section>
        )}

        <section className="grid gap-2" aria-labelledby="rank">
          <Overline as="h2" id="rank">
            Classement
          </Overline>
          <ol className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
            {c.ranking.slice(0, 10).map((r, i) => {
              const me = r.userId === user.id;
              return (
                <li key={r.userId} className="grid grid-cols-[28px_auto_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5">
                  <span className="text-center font-display text-lg font-bold tabular">{i + 1}</span>
                  <Avatar initials={initials(r.name)} size="sm" tone={me ? "accent" : "brand"} />
                  <span className={cn("truncate text-sm", me && "font-bold")}>
                    {r.name}
                    {me ? " (vous)" : ""}
                  </span>
                  <span className={cn("text-sm tabular", i === 0 && "font-bold")}>{r.mark.toLocaleString("fr-FR")}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {c.kind !== "LOT" && c.pot > 0 && (
          <section className="grid gap-2" aria-labelledby="payout">
            <Overline as="h2" id="payout">
              Versement de la cagnotte ({formatFCFA(c.pot)})
            </Overline>
            <Card className="gap-4">
              <PrizeSplit total={c.pot} labels={[iWon ? "Vous" : "Gagnant", mentorPayout?.beneficiary ?? "Son mentor", "KABAD"]} />
              <ol className="m-0 grid list-none p-0">
                {steps.map((s, i) => (
                  <li key={s.label} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-3.5 last:pb-0">
                    {i < steps.length - 1 && <span className="absolute top-5 bottom-0 left-[9px] w-0.5 bg-line" aria-hidden="true" />}
                    <span className={cn("grid size-5 place-items-center rounded-full", s.done ? "bg-success text-on-success" : "border-2 border-line-strong bg-raised")}>
                      {s.done && <Icon name="check" size={16} strokeWidth={3} className="size-3" />}
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-bold">{s.label}</span>
                      <span className={cn("text-xs text-muted", "mono" in s && s.mono && "font-mono")}>{s.when}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        )}
      </Page>
    </>
  );
}

export default function ResultsPage({ params }: PageProps<"/defis/[id]/resultats">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des résultats…</p>}>
      <ResultsData params={params} />
    </Suspense>
  );
}
