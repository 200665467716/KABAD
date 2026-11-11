import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, Badge, Overline, TagList } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { formatClock, initials } from "@/lib/format";
import { orNotFound } from "@/server/messaging";
import { getMentor } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.profile");
  return { title: t("mentorTitle") };
}

/** "2026-11-05": the calendar day of a moment in a time zone. */
const dayOf = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/**
 * Screen M2, the mentor's sheet: who they are, what the KABAD team checked for the badge (job, links to
 * their work), what they can help with, and their three next slots. The calendar is the next screen (M3).
 */
async function MentorData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/mentors/${id}`);
  const mentor = await orNotFound(getMentor(id));
  if (!mentor) notFound();
  const [t, format, locale] = await Promise.all([getTranslations("mentoring.profile"), getFormatter(), getLocale()]);
  const self = mentor.id === user.id;
  const gender = mentor.gender ?? "other";
  // One subject per line when the mentor wrote several.
  const topics = mentor.topics.split("\n").map((x) => x.trim()).filter(Boolean);
  const links = [
    { label: "GitHub", href: mentor.links.github },
    { label: "LinkedIn", href: mentor.links.linkedin },
    { label: t("portfolio"), href: mentor.links.portfolio },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));
  const today = dayOf(new Date(), user.timeZone);
  const next = mentor.slots.slice(0, 3).map((iso) => {
    const at = new Date(iso);
    return { iso, day: dayOf(at, user.timeZone) === today ? t("today") : format.dateTime(at, { weekday: "short", day: "numeric", month: "short", timeZone: user.timeZone }), time: formatClock(at, locale, user.timeZone) };
  });
  return (
    <>
      <Page narrow className="flex-1 gap-5">
        <section aria-label={mentor.name} className="grid gap-3">
          <div className="flex items-center gap-3">
            <Avatar initials={initials(mentor.name)} size="lg" tone="brand" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <h2 className="font-display text-lg leading-6 font-extrabold">{mentor.name}</h2>
              <span className="text-sm text-muted">{[mentor.jobTitle || mentor.headline, mentor.city].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success" icon="check">
              {t("verified", { gender })}
            </Badge>
            <span className="text-xs font-extrabold text-brand-text">{t("sessionsHeld", { count: mentor.sessionsHeld })}</span>
            {mentor.rating && <span className="text-xs font-extrabold text-brand-text">· {t("rating", { average: mentor.rating.average, count: mentor.rating.count })}</span>}
          </div>
          {mentor.bio && <p className="text-[15px] leading-[22px]">{mentor.bio}</p>}
          <TagList items={[...mentor.domains, ...mentor.technologies]} />
        </section>

        {topics.length > 0 && (
          <section className="grid gap-2" aria-labelledby="mp-topics">
            <Overline as="h3" id="mp-topics">
              {t("about", { gender })}
            </Overline>
            {topics.length === 1 ? (
              <p className="text-[15px] leading-[22px]">{topics[0]}</p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {topics.map((topic) => (
                  <li key={topic} className="flex items-start gap-2 text-[15px] leading-[22px]">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0 text-success" />
                    {topic}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {links.length > 0 && (
          <section className="grid gap-2" aria-labelledby="mp-work">
            <Overline as="h3" id="mp-work">
              {t("work")}
            </Overline>
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2.5 rounded-action border-2 border-line-strong bg-raised px-3 text-sm font-extrabold text-ink no-underline hover:bg-bg">
                  <Icon name="external" size={18} />
                  {l.label}
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-2" aria-labelledby="mp-next">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Overline as="h3" id="mp-next">
              {t("nextSlots")}
            </Overline>
            <span className="text-[13px] font-bold text-muted">{t("freeSession")}</span>
          </div>
          {next.length === 0 ? (
            <p className="rounded-action bg-bg px-4 py-5 text-center text-sm text-muted">{t("noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {next.map((s) =>
                self ? (
                  <span key={s.iso} className="grid min-h-11 place-items-center rounded-action border-2 border-line-strong bg-raised px-2 py-1.5 text-center text-[13px] leading-[1.2] font-extrabold">
                    {s.time}
                    <small className="block text-[11px] font-semibold text-muted">{s.day}</small>
                  </span>
                ) : (
                  <Link key={s.iso} href={`/mentorat/mentors/${mentor.id}/reserver?creneau=${encodeURIComponent(s.iso)}`} className="grid min-h-11 place-items-center rounded-action border-2 border-line-strong bg-raised px-2 py-1.5 text-center text-[13px] leading-[1.2] font-extrabold text-ink no-underline hover:bg-bg">
                    {s.time}
                    <small className="block text-[11px] font-semibold text-muted">{s.day}</small>
                  </Link>
                ),
              )}
            </div>
          )}
        </section>
        {self && <p className="rounded-action bg-brand-wash px-4 py-3 text-sm">{t("self")}</p>}
      </Page>
      {!self && next.length > 0 && (
        <ActionBar>
          <ButtonLink href={`/mentorat/mentors/${mentor.id}/creneaux`} size="lg" block>
            {t("bookCta")}
          </ButtonLink>
        </ActionBar>
      )}
    </>
  );
}

export default async function MentorPage({ params }: PageProps<"/[locale]/mentorat/mentors/[id]">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("profile.mentorTitle")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <MentorData params={params} />
      </Suspense>
    </>
  );
}
