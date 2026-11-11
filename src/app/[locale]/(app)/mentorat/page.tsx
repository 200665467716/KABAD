import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { BookingSummary } from "@/components/features/mentoring/BookingSummary";
import { MentorCard } from "@/components/features/mentoring/MentorCard";
import { cn } from "@/lib/cn";
import { BADGE_DOMAINS, myBadgeRequest } from "@/server/badges";
import { getCurrentUser } from "@/server/auth";
import { listMentors, myBookings } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

/** A session still to come or running. */
const notOver = (iso: string, minutes: number) => new Date(iso).getTime() + minutes * 60_000 > Date.now();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring");
  return { title: t("title") };
}

type Search = { domaine?: string; q?: string };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

function Row({ href, title, text, icon }: { href: string; title: string; text: string; icon: "users" | "calendar" | "clock" }) {
  return (
    <Link href={href} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 text-ink no-underline hover:bg-bg [&+&]:border-t-2 [&+&]:border-line">
      <span className="grid size-11 place-items-center rounded-action bg-brand-wash text-brand-text">
        <Icon name={icon === "calendar" ? "clock" : icon} size={20} />
      </span>
      <span className="grid min-w-0">
        <b className="text-[15px]">{title}</b>
        <span className="truncate text-[13px] text-muted">{text}</span>
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  );
}

async function MentoringData({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await pageUser("/mentorat");
  const { domaine, q } = await searchParams;
  const [t, mentors, bookings, badge] = await Promise.all([getTranslations("mentoring"), listMentors({ domain: domaine, excludeId: user.id }), myBookings(user.id), myBadgeRequest(user.id)]);
  const tz = user.timeZone;
  const query = q?.trim() ? norm(q.trim()) : null;
  const shown = query ? mentors.filter((m) => norm([m.name, m.city, m.headline, ...m.domains, ...m.technologies].join(" ")).includes(query)) : mentors;
  const isMentor = user.seniorVerifiedAt !== null;
  const mine = bookings.asMentee.filter((b) => (b.status === "PENDING" || b.status === "ACCEPTED") && notOver(b.startsAt, b.minutes));
  const upcomingAsMentor = bookings.upcoming.filter((b) => b.iAm === "MENTOR").length;
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} aria-current={on ? "true" : undefined} className={cn("inline-flex h-11 shrink-0 items-center rounded-full border-2 border-line-strong px-4 text-sm font-extrabold whitespace-nowrap no-underline", on ? "bg-ink text-raised" : "bg-raised text-ink")}>
      {label}
    </Link>
  );

  return (
    <Page>
      {isMentor && (
        <section aria-labelledby="m-mentor" className="grid gap-3">
          <h2 id="m-mentor" className="font-display text-md font-extrabold uppercase">
            {t("list.mentorSide")}
          </h2>
          <div className="overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
            <Row href="/mentorat/demandes" icon="clock" title={t("list.requests")} text={`${t("list.requestsCount", { count: bookings.toAnswer.length })} · ${t("list.upcomingAsMentor", { count: upcomingAsMentor })}`} />
            <Row href="/mentorat/disponibilites" icon="calendar" title={t("list.availability")} text={t("list.availabilityText")} />
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="m-mine" className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="m-mine" className="font-display text-md font-extrabold uppercase">
              {t("list.mySessions")}
            </h2>
            <Link href="/mentorat/seances" className="inline-flex min-h-11 items-center text-sm font-extrabold text-brand-text no-underline">
              {t("history.all")}
            </Link>
          </div>
          {mine.map((b) => (
            <Link key={b.id} href={`/mentorat/seances/${b.id}`} className="rounded-lg border-2 border-line-strong bg-raised p-4 text-ink no-underline">
              <BookingSummary startsAt={b.startsAt} minutes={b.minutes} topic={b.topic} otherName={b.mentor.name} timeZone={tz} status={b.status} />
            </Link>
          ))}
        </section>
      )}

      {mine.length === 0 && bookings.asMentee.length + bookings.asMentorAccepted.length > 0 && (
        <Link href="/mentorat/seances" className="inline-flex min-h-11 items-center justify-self-start text-sm font-extrabold text-brand-text no-underline">
          {t("history.all")}
        </Link>
      )}

      <form method="get" role="search" className="flex gap-2">
        {domaine && <input type="hidden" name="domaine" value={domaine} />}
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md border-2 border-line-strong bg-raised px-3.5">
          <Icon name="search" size={18} className="text-muted" />
          <input name="q" type="search" defaultValue={q ?? ""} aria-label={t("list.search")} placeholder={t("list.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-base outline-none" />
        </label>
        <button type="submit" className="h-12 rounded-md bg-ink px-4 text-sm font-extrabold text-raised">
          {t("list.searchButton")}
        </button>
      </form>

      <nav aria-label={t("list.domains")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {chip(q ? `/mentorat?q=${encodeURIComponent(q)}` : "/mentorat", t("list.all"), !domaine)}
        {BADGE_DOMAINS.map((d) => chip(`/mentorat?domaine=${encodeURIComponent(d)}${q ? `&q=${encodeURIComponent(q)}` : ""}`, t(`badge.domainList.${d}`), domaine === d))}
      </nav>

      <section aria-labelledby="m-list" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="m-list" className="font-display text-md font-extrabold uppercase">
            {t("list.heading")}
          </h2>
          <span className="text-[13px] font-bold text-muted">{t("list.free")}</span>
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-muted">{t("list.empty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map((m) => (
              <MentorCard key={m.id} mentor={m} timeZone={tz} />
            ))}
          </div>
        )}
      </section>

      {!isMentor && (
        <Link href="/mentorat/badge" className="text-ink no-underline">
          <Card className="grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-brand-soft">
            <span className="grid gap-0.5">
              <b className="text-[15px]">{t("list.badgeTitle")}</b>
              <span className="text-[13px] text-muted">{badge?.status === "PENDING" ? t("list.badgePending") : t("list.badgeText")}</span>
            </span>
            <Icon name="chevron" size={18} />
          </Card>
        </Link>
      )}
    </Page>
  );
}

/** M1: for a mentor, the requests to answer are one tap away in the header, with a dot when some are waiting. */
async function RequestsButton() {
  const user = await getCurrentUser();
  if (!user?.seniorVerifiedAt) return null;
  const [t, { toAnswer }] = await Promise.all([getTranslations("mentoring.list"), myBookings(user.id)]);
  return <IconButton icon="clock" href="/mentorat/demandes" dot={toAnswer.length > 0} label={t("requestsHeader", { count: toAnswer.length })} />;
}

export default async function MentoringPage({ searchParams }: PageProps<"/[locale]/mentorat">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar
        title={t("title")}
        actions={
          <Suspense>
            <RequestsButton />
          </Suspense>
        }
      />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <MentoringData searchParams={searchParams as Promise<Search>} />
      </Suspense>
    </>
  );
}
