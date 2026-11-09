import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Overline } from "@/components/ui/Display";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { getResults, myFeedback, myTeam } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

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
  // The 1st prize goes to the 1st team, and so on; without prizes, only the 1st team has won.
  const myRank = team ? h.ranking.findIndex((r) => r.teamId === team.id) : -1;
  const mine = myRank >= 0 ? h.ranking[myRank] : null;
  const myPrize = myRank >= 0 && myRank < h.prizes.length ? h.prizes[myRank] : null;
  const iWon = mine !== null && (myPrize !== null || (h.prizes.length === 0 && myRank === 0));
  return (
    <>
      <TopBar back="/hackathons" title={h.title} subtitle={t("subtitle", { date: long(h.endsAt), count: h.teams })} />
      <Page narrow>
        {iWon && mine && (
          <section className="grid gap-1.5 rounded-xl border-2 border-line-strong bg-accent p-4 text-on-accent shadow-pop">
            <p className="text-xs font-extrabold tracking-[0.1em] uppercase">{t("youWon")}</p>
            <p className="font-celebrate text-[30px] leading-9 font-extrabold tabular">{myPrize ?? t("prize")}</p>
            <p className="text-sm">{t("winnerMark", { mark: mark(mine.mark), team: mine.team })}</p>
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

        {h.prizes.length > 0 && (
          <section className="grid gap-2" aria-labelledby="prizes">
            <Overline as="h2" id="prizes">
              {t("prizes")}
            </Overline>
            <ol className="m-0 grid list-none gap-2 p-0">
              {h.prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-action border-2 border-line-strong bg-raised px-3.5 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-accent">{i + 1}</span>
                  <span className="font-bold">{p}</span>
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-muted">{t("prizesBy", { organizer: h.organizerName })}</p>
          </section>
        )}
      </Page>
    </>
  );
}

export default async function ResultsPage({ params }: PageProps<"/[locale]/hackathons/[id]/resultats">) {
  const t = await getTranslations("hackathons.results");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <ResultsData params={params} />
    </Suspense>
  );
}
