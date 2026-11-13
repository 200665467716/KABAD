import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Band } from "@/components/ui/Band";
import { Avatar, MentorBadge, Overline, TagList } from "@/components/ui/Display";
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
  const [t, tb, format, locale] = await Promise.all([getTranslations("mentoring.profile"), getTranslations("mentoring.badge"), getFormatter(), getLocale()]);
  const self = mentor.id === user.id;
  const gender = mentor.gender ?? "other";
  // One subject per line when the mentor wrote several.
  const topics = mentor.topics.split("\n").map((x) => x.trim()).filter(Boolean);
  const links = [
    { label: "GitHub", href: mentor.links.github, icon: "code" as const },
    { label: "LinkedIn", href: mentor.links.linkedin, icon: "user" as const },
    { label: t("portfolio"), href: mentor.links.portfolio, icon: "globe" as const },
  ].filter((l): l is { label: string; href: string; icon: "code" | "user" | "globe" } => Boolean(l.href));
  const experience = (["3-5", "5-10", "10+"] as const).find((x) => x === mentor.experience);
  const today = dayOf(new Date(), user.timeZone);
  const next = mentor.slots.slice(0, 3).map((iso) => {
    const at = new Date(iso);
    return { iso, day: dayOf(at, user.timeZone) === today ? t("today") : format.dateTime(at, { weekday: "short", day: "numeric", month: "short", timeZone: user.timeZone }), time: formatClock(at, locale, user.timeZone) };
  });
  return (
    <>
      <Page narrow className="flex-1 gap-5">
        {/* P9: the mentor's card stands out, an indigo header with the seal, then three figures. It is the one featured card of the screen. */}
        <section aria-label={mentor.name} className="overflow-hidden rounded-xl border-2 border-line-strong bg-raised shadow-pop">
          <div className="grid justify-items-center gap-2 bg-header px-4 pt-6 pb-4 text-center text-on-header">
            <Avatar initials={initials(mentor.name)} src={mentor.photo} size="xl" tone="neutral" verified />
            <h2 className="font-display text-xl leading-7 font-extrabold">{mentor.name}</h2>
            <span className="text-sm opacity-85">{[mentor.jobTitle || mentor.headline, mentor.city].filter(Boolean).join(" · ")}</span>
            <MentorBadge light>{t("verified", { gender })}</MentorBadge>
          </div>
          <Band />
          <dl className="m-0 grid grid-cols-3 divide-x-2 divide-line border-b-2 border-line text-center">
            <div className="grid min-w-0 content-start gap-0.5 px-1.5 py-3">
              <dd className="m-0 font-display text-base leading-6 font-extrabold break-words sm:text-xl tabular">{mentor.sessionsHeld}</dd>
              <dt className="text-[10px] leading-tight font-extrabold tracking-[0.04em] text-muted uppercase sm:text-[11px]">{t("statSessions", { count: mentor.sessionsHeld })}</dt>
            </div>
            <div className="grid min-w-0 content-start gap-0.5 px-1.5 py-3">
              <dd className="m-0 font-display text-base leading-6 font-extrabold break-words sm:text-xl">{experience ? tb(`experienceOptions.${experience}`) : "—"}</dd>
              <dt className="text-[10px] leading-tight font-extrabold tracking-[0.04em] text-muted uppercase sm:text-[11px]">{t("statExperience")}</dt>
            </div>
            <div className="grid min-w-0 content-start gap-0.5 px-1.5 py-3">
              <dd className="m-0 font-display text-base leading-6 font-extrabold break-words sm:text-xl tabular">{mentor.rating ? `${format.number(mentor.rating.average, { maximumFractionDigits: 1 })} / 5` : t("statNew")}</dd>
              <dt className="text-[10px] leading-tight font-extrabold tracking-[0.04em] text-muted uppercase sm:text-[11px]">{mentor.rating ? t("statRatings", { count: mentor.rating.count }) : t("statRating")}</dt>
            </div>
          </dl>
          {(mentor.bio || mentor.domains.length + mentor.technologies.length > 0) && (
            <div className="grid gap-3 p-4">
              {mentor.bio && <p className="text-[15px] leading-[22px]">{mentor.bio}</p>}
              <TagList items={[...mentor.domains, ...mentor.technologies]} />
            </div>
          )}
        </section>

        {topics.length > 0 && (
          <section className="grid gap-2" aria-labelledby="mp-topics">
            <Overline as="h3" id="mp-topics">
              {t("about", { gender })}
            </Overline>
            {topics.length === 1 ? (
              <p className="text-[15px] leading-[22px]">{topics[0]}</p>
            ) : (
              <ol className="m-0 grid list-none gap-2 p-0">
                {topics.map((topic, i) => (
                  <li key={topic} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-lg border-2 border-line-strong bg-raised px-3 py-2.5 text-[15px] leading-[21px]">
                    <span className="grid size-8 place-items-center rounded-full bg-brand-wash font-display text-sm font-extrabold text-brand-text">{i + 1}</span>
                    {topic}
                  </li>
                ))}
              </ol>
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
                  <Icon name={l.icon} size={18} />
                  {l.label}
                  <Icon name="external" size={16} className="text-muted" />
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
