import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BookingSummary } from "@/components/features/mentoring/BookingSummary";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ScreenSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { sessionBucket, type SessionBucket } from "@/lib/mentoring";
import { sessionHistory } from "@/server/mentoring";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("mentoring.history"))("metaTitle") };
}

const TABS: Array<{ id: SessionBucket; param: string }> = [
  { id: "upcoming", param: "a-venir" },
  { id: "past", param: "passees" },
  { id: "closed", param: "annulees" },
];

/** History of the member's sessions, as a mentee and as a mentor: upcoming, held, cancelled or declined. */
async function HistoryData({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const user = await pageUser("/mentorat/seances");
  const [t, all, { onglet }] = await Promise.all([getTranslations("mentoring.history"), sessionHistory(user.id), searchParams]);
  const now = new Date();
  const tab = TABS.find((x) => x.param === onglet) ?? TABS[0];
  const of = (id: SessionBucket) => all.filter((b) => sessionBucket(b, now) === id);
  // Upcoming sessions read from the nearest one; the others from the most recent one.
  const shown = tab.id === "upcoming" ? of("upcoming").reverse() : of(tab.id);
  const empty = { upcoming: t("emptyUpcoming"), past: t("emptyPast"), closed: t("emptyClosed") }[tab.id];
  return (
    <Page narrow>
      <nav aria-label={t("tabs")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((x) => (
          <Link
            key={x.id}
            href={x.id === "upcoming" ? "/mentorat/seances" : `/mentorat/seances?onglet=${x.param}`}
            aria-current={x.id === tab.id ? "page" : undefined}
            className={cn("inline-flex h-11 shrink-0 items-center rounded-full border-2 border-line-strong px-4 text-sm font-extrabold whitespace-nowrap no-underline", x.id === tab.id ? "bg-ink text-raised" : "bg-raised text-ink")}
          >
            {t("count", { label: t(x.id), count: of(x.id).length })}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" size={24} className="size-7" />}
          title={empty}
          action={
            tab.id === "upcoming" ? (
              <ButtonLink href="/mentorat" variant="ink" icon="search">
                {t("find")}
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {shown.map((b) => {
            const other = b.iAm === "MENTOR" ? b.mentee : b.mentor;
            return (
              <li key={b.id}>
                <Link href={`/mentorat/seances/${b.id}`} className="grid gap-2 rounded-lg border-2 border-line-strong bg-raised p-4 text-ink no-underline">
                  <BookingSummary startsAt={b.startsAt} minutes={b.minutes} topic={b.topic} otherName={other.name} timeZone={user.timeZone} status={b.status} />
                  <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">{b.iAm === "MENTOR" ? t("asMentor") : t("asMentee")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

export default async function SessionHistoryPage({ searchParams }: PageProps<"/[locale]/mentorat/seances">) {
  const t = await getTranslations("mentoring.history");
  return (
    <>
      <TopBar back="/mentorat" title={t("title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <HistoryData searchParams={searchParams} />
      </Suspense>
    </>
  );
}
