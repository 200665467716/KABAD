import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Avatar, AvatarGroup, Badge, Card } from "@/components/ui/Display";
import { PotSplit } from "@/components/features/hackathons/PotSplit";
import { formatFCFA, initials } from "@/lib/format";
import { getHackathon, recentContributions } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { ContributionForm } from "./ContributionForm";
import { SponsorShell } from "./SponsorShell";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.sponsor");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

async function SponsorData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const h = await orNotFound(getHackathon(null, id));
  if (!h || h.prizeKind !== "CAGNOTTE") notFound();
  const [t, format, recent] = await Promise.all([getTranslations("hackathons.sponsor"), getFormatter(), recentContributions(h.id)]);
  const open = h.status === "OPEN";
  const withMentor = h.mentoringMinutes > 0;
  const shares = withMentor
    ? [
        { title: t("share.winner3"), text: t("share.winnerText") },
        { title: t("share.mentor"), text: t("share.mentorText") },
        { title: t("share.platform"), text: t("share.platformText") },
      ]
    : [
        { title: t("share.winner2"), text: t("share.winnerText") },
        { title: t("share.platform"), text: t("share.platformText") },
      ];

  return (
    <SponsorShell>
      <main>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 py-8 lg:gap-16 lg:px-10 lg:py-18">
          <div className="grid min-w-0 flex-[999_1_480px] gap-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">{t("badge")}</Badge>
              <Badge>{open ? t("openUntil", { date: format.dateTime(new Date(h.endsAt), { day: "numeric", month: "long" }) }) : t("closedBadge")}</Badge>
            </div>
            <h1 className="font-display text-[32px] leading-[38px] font-extrabold uppercase lg:text-[52px] lg:leading-[58px]">{h.title}</h1>
            <p className="text-sm font-extrabold text-brand-text">{t("by", { organizer: h.organizerName })}</p>
            <p className="max-w-[60ch] text-lg text-muted">
              {h.description} {withMentor ? t("introMentor") : t("intro")}
            </p>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { n: h.teams, label: t("teams") },
                { n: h.jury.length, label: t("jurors") },
                { n: h.contributors, label: t("contributors") },
              ].map((x) => (
                <div key={x.label} className="grid">
                  <dt className="order-2 text-sm text-muted">{x.label}</dt>
                  <dd className="m-0 font-display text-2xl font-extrabold tabular">{x.n}</dd>
                </div>
              ))}
            </dl>
            {h.jury.length > 0 && (
              <div className="flex items-center gap-3">
                <AvatarGroup>
                  {h.jury.map((j) => (
                    <Avatar key={j.id} initials={initials(j.name)} size="sm" />
                  ))}
                </AvatarGroup>
                <span className="text-sm text-muted">{t("jury", { names: h.jury.map((j) => j.name).join(", ") })}</span>
              </div>
            )}
          </div>
          <aside className="w-full min-w-0 flex-[1_1_360px] lg:max-w-[440px]">
            <ContributionForm open={open} collected={h.pot} contributors={h.contributors} companies={h.companies} />
          </aside>
        </div>

        <section className="border-t-2 border-line-strong bg-raised" aria-labelledby="money">
          <div className="mx-auto grid max-w-[1200px] gap-7 px-4 py-10 lg:px-10 lg:py-18">
            <div className="grid max-w-[680px] gap-2">
              <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{t("moneyKicker")}</p>
              <h2 id="money" className="font-display text-2xl font-extrabold uppercase lg:text-3xl">
                {withMentor ? t("moneyTitleMentor") : t("moneyTitle")}
              </h2>
            </div>
            <PotSplit total={Math.max(h.pot, 100)} withMentor={withMentor} labels={{ winner: t("winner"), mentor: t("mentor"), platform: "KABAD" }} className="[&_dd]:hidden" />
            <div className={withMentor ? "grid gap-5 md:grid-cols-3" : "grid gap-5 md:grid-cols-2"}>
              {shares.map((s) => (
                <div key={s.title} className="grid gap-1">
                  <span className="text-xs font-extrabold tracking-[0.06em] uppercase">{s.title}</span>
                  <p className="text-sm text-muted">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t-2 border-line-strong" aria-labelledby="recent">
          <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-10 lg:px-10 lg:py-18">
            <h2 id="recent" className="font-display text-lg font-extrabold uppercase">
              {t("recent")}
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {recent.map((r, i) => (
                <Card key={i} className="gap-1.5 px-4 py-3.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{r.name === "Anonyme" ? t("anonymous") : r.name}</span>
                    <span className="font-bold tabular">{format.number(r.amount)}</span>
                  </div>
                  <span className="text-xs text-muted">{format.relativeTime(new Date(r.createdAt))}</span>
                </Card>
              ))}
              {recent.length === 0 && <p className="text-muted">{t("beFirst")}</p>}
            </div>
            <p className="text-xs text-muted">{t("total", { total: formatFCFA(h.pot) })}</p>
          </div>
        </section>
      </main>
    </SponsorShell>
  );
}

export default async function SponsorPage({ params }: PageProps<"/[locale]/soutenir/[id]">) {
  const t = await getTranslations("hackathons.sponsor");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <SponsorData params={params} />
    </Suspense>
  );
}
