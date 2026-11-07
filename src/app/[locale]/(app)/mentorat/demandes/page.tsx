import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Card } from "@/components/ui/Display";
import { AnswerRequest } from "@/components/features/mentoring/AnswerRequest";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { BookingView } from "@/lib/domain-types";
import { myBookings } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.requests");
  return { title: t("title") };
}

async function RequestsData({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const user = await pageUser("/mentorat/demandes");
  const { onglet } = await searchParams;
  const accepted = onglet === "acceptees";
  const [b, t, format] = await Promise.all([myBookings(user.id), getTranslations("mentoring.requests"), getFormatter()]);
  const list: BookingView[] = accepted ? [...b.asMentorAccepted].reverse() : b.toAnswer;
  const tz = user.timeZone;
  const when = (r: BookingView) => {
    const at = new Date(r.startsAt);
    const end = new Date(at.getTime() + r.minutes * 60_000);
    const hm = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", timeZone: tz });
    return t("range", { day: format.dateTime(at, { weekday: "short", day: "numeric", month: "short", timeZone: tz }), start: hm(at), end: hm(end) });
  };
  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={cn("grid h-10 place-items-center rounded-[10px] px-3 text-sm font-extrabold whitespace-nowrap no-underline", on ? "bg-ink text-raised" : "text-muted")}>
      {label}
    </Link>
  );
  return (
    <Page narrow>
      <nav aria-label={t("tabs")} className="grid grid-cols-2 gap-1 rounded-action border-2 border-line-strong bg-raised p-1">
        {tab("/mentorat/demandes", t("toAnswer", { count: b.toAnswer.length }), !accepted)}
        {tab("/mentorat/demandes?onglet=acceptees", t("accepted"), accepted)}
      </nav>
      {list.length === 0 ? (
        <p className="py-8 text-center text-muted">{accepted ? t("emptyAccepted") : t("emptyToAnswer")}</p>
      ) : (
        list.map((r) => (
          <Card key={r.id} className="gap-3">
            <div className="flex items-center gap-3">
              <Avatar initials={initials(r.mentee.name)} size="md" tone="brand" />
              <div className="grid min-w-0">
                <b className="truncate text-[15px]">{r.mentee.name}</b>
                <span className="truncate text-[13px] text-muted">{[r.mentee.headline, r.mentee.city].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            <p className="rounded-md bg-brand-wash px-3 py-2 text-sm font-extrabold text-brand-text">{when(r)}</p>
            <div className="grid gap-1">
              <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">{t("topic")}</span>
              <p className="text-[15px] font-extrabold">{r.topic}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">{t("problem")}</span>
              <p className="text-sm">{r.problem}</p>
            </div>
            {accepted ? (
              <Link href={`/mentorat/seances/${r.id}`} className="text-sm font-extrabold text-brand-text no-underline">
                {t("open")}
              </Link>
            ) : (
              <AnswerRequest id={r.id} name={r.mentee.name} />
            )}
          </Card>
        ))
      )}
    </Page>
  );
}

export default async function RequestsPage({ searchParams }: PageProps<"/[locale]/mentorat/demandes">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("requests.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <RequestsData searchParams={searchParams as Promise<{ onglet?: string }>} />
      </Suspense>
    </>
  );
}
