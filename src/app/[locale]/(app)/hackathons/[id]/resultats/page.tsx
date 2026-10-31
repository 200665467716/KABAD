import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Overline } from "@/components/ui/Display";
import { PotSplit } from "@/components/features/hackathons/PotSplit";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatFCFA, initials } from "@/lib/format";
import { CONTEST_HOURS, getResults, myFeedback, myTeam } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.results");
  return { title: t("title") };
}

async function ResultsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/resultats`);
  const h = await orNotFound(getResults(id));
  if (!h) notFound();
  const [t, format, feedback, team] = await Promise.all([getTranslations("hackathons.results"), getFormatter(), myFeedback(user.id, id), myTeam(user.id, id)]);
  const long = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" });
  const mark = (n: number) => format.number(n, { maximumFractionDigits: 1 });
  const top = h.ranking[0];
  const iWon = team !== null && top?.teamId === team.id;
  const winnerPayout = h.payouts.find((p) => p.role === "WINNER");
  const mentorPayout = h.payouts.find((p) => p.role === "MENTOR");
  const withMentor = h.mentoringMinutes > 0;
  const published = h.publishedAt ?? h.endsAt;
  const contestEnds = new Date(new Date(published).getTime() + CONTEST_HOURS * 3600_000).toISOString();
  const steps = [
    { label: t("stepPublished"), when: long(published), done: true, mono: false },
    { label: t("stepContest", { hours: CONTEST_HOURS }), when: long(contestEnds), done: new Date(contestEnds).getTime() <= readClock(), mono: false },
    winnerPayout?.status === "SENT"
      ? { label: t("stepSent", { operator: winnerPayout.operator ?? "Mobile Money", phone: winnerPayout.phone ?? "" }), when: `${long(winnerPayout.sentAt!)} · ${t("ref", { ref: winnerPayout.reference ?? "" })}`, mono: true, done: true }
      : { label: t("stepSend"), when: t("waiting"), done: false, mono: false },
  ];

  return (
    <>
      <TopBar back="/hackathons" title={h.title} subtitle={t("subtitle", { date: long(h.endsAt), count: h.teams })} />
      <Page narrow>
        {iWon && (
          <section className="grid gap-1.5 rounded-xl border-2 border-line-strong bg-accent p-4 text-on-accent shadow-pop">
            <p className="text-xs font-extrabold tracking-[0.1em] uppercase">{t("youWon")}</p>
            <p className="font-celebrate text-[30px] leading-9 font-extrabold tabular">{h.prizeKind === "LOT" || !winnerPayout ? (h.prizes[0] ?? t("prize")) : formatFCFA(winnerPayout.amount)}</p>
            <p className="text-sm">{t("winnerMark", { mark: mark(top.mark), team: top.team })}</p>
          </section>
        )}

        {feedback && (
          <section className="grid gap-2" aria-labelledby="feedback">
            <Overline as="h2" id="feedback">
              {t("yourMark", { mark: mark(feedback.mark) })}
            </Overline>
            {feedback.comments.length > 0 ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {feedback.comments.map((comment, i) => (
                  <li key={i} className="rounded-action bg-raised px-3.5 py-3 text-sm">
                    « {comment} »
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("noComment")}</p>
            )}
          </section>
        )}

        <section className="grid gap-2" aria-labelledby="rank">
          <Overline as="h2" id="rank">
            {t("ranking")}
          </Overline>
          <ol className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
            {h.ranking.slice(0, 10).map((r, i) => {
              const mine = r.teamId === team?.id;
              return (
                <li key={r.teamId} className="grid grid-cols-[28px_auto_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5">
                  <span className="text-center font-display text-lg font-extrabold tabular">{i + 1}</span>
                  <Avatar initials={initials(r.team)} size="sm" tone={mine ? "accent" : "brand"} />
                  <span className={cn("grid min-w-0 text-sm", mine && "font-extrabold")}>
                    <span className="truncate">
                      {r.team}
                      {mine ? ` ${t("you")}` : ""}
                    </span>
                    {r.team !== r.captain && <span className="truncate text-xs text-muted">{t("captain", { name: r.captain })}</span>}
                  </span>
                  <span className={cn("text-sm tabular", i === 0 && "font-extrabold")}>{mark(r.mark)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {h.prizeKind !== "LOT" && h.pot > 0 && (
          <section className="grid gap-2" aria-labelledby="payout">
            <Overline as="h2" id="payout">
              {t("payout", { pot: formatFCFA(h.pot) })}
            </Overline>
            <Card className="gap-4">
              <PotSplit total={h.pot} withMentor={withMentor} labels={{ winner: iWon ? t("yourTeam") : t("winner"), mentor: mentorPayout?.beneficiary ?? t("mentor"), platform: "KABAD" }} />
              <p className="text-xs text-muted">{withMentor ? t("level3") : t("level2")}</p>
              <ol className="m-0 grid list-none p-0">
                {steps.map((s, i) => (
                  <li key={s.label} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-3.5 last:pb-0">
                    {i < steps.length - 1 && <span className="absolute top-5 bottom-0 left-[9px] w-0.5 bg-line" aria-hidden="true" />}
                    <span className={cn("grid size-5 place-items-center rounded-full", s.done ? "bg-success text-on-success" : "border-2 border-line-strong bg-raised")}>
                      {s.done && <Icon name="check" size={16} strokeWidth={3} className="size-3" />}
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-bold">{s.label}</span>
                      <span className={cn("text-xs text-muted", s.mono && "font-mono")}>{s.when}</span>
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

export default async function ResultsPage({ params }: PageProps<"/[locale]/hackathons/[id]/resultats">) {
  const t = await getTranslations("hackathons.results");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <ResultsData params={params} />
    </Suspense>
  );
}
