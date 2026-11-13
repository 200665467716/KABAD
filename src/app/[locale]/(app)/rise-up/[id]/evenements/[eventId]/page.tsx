import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RiseSymbol } from "@/components/features/rise/RiseSymbol";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Overline } from "@/components/ui/Display";
import { Link } from "@/i18n/navigation";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { getEvent } from "@/server/rise";
import { AddToCalendar } from "@/components/features/AddToCalendar";
import { CloseRoomButton } from "./CloseRoomButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise.event");
  return { title: t("metaTitle") };
}

/**
 * Screen R4. There is no audio room inside KABAD: a project event or room is held on a Google Meet link,
 * shown to the project's members, and marked "live" while it runs. Its author can close a live room.
 */
async function EventData({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const user = await pageUser(`/rise-up/${id}/evenements/${eventId}`);
  const e = await orNotFound(getEvent(user.id, id, eventId));
  if (!e) notFound();
  const [t, format] = await Promise.all([getTranslations("rise.event"), getFormatter()]);
  const start = new Date(e.startsAt);
  const ended = e.ended;
  return (
    <>
      <TopBar back={`/rise-up/${id}`} title={e.projectName} />
      <Page narrow className="flex-1">
        <section className="grid gap-3 rounded-xl bg-ink p-5 text-raised">
          <div className="flex items-center justify-between gap-3">
            {e.live ? <Badge tone="live" className="bg-raised/10">{t("live")}</Badge> : <Badge tone="neutral">{ended ? t("ended") : t("upcoming")}</Badge>}
            <RiseSymbol size={36} leaf="#f2b705" className="text-accent" />
          </div>
          <h2 className="font-display text-2xl font-extrabold uppercase">{e.title}</h2>
          <p className="text-sm font-semibold text-[var(--grey-light)]">
            {t("when", { date: format.dateTime(start, { weekday: "long", day: "numeric", month: "long", timeZone: user.timeZone }), time: format.dateTime(start, { hour: "numeric", minute: "2-digit", timeZone: user.timeZone }) })} · {t("duration", { minutes: e.minutes })}
          </p>
          <Link href={`/rise-up/${id}`} className="text-sm font-extrabold text-accent no-underline">
            {e.projectName}
          </Link>
        </section>
        {/* A room opened on the spot has no agenda. */}
        {e.agenda && (
          <section className="grid gap-2" aria-labelledby="agenda">
            <Overline as="h3" id="agenda">
              {t("agenda")}
            </Overline>
            <p className="text-[15px] leading-[22px] whitespace-pre-line">{e.agenda}</p>
          </section>
        )}
        {e.createdBy && <p className="text-[13px] text-muted">{t("by", { name: e.createdBy.name })}</p>}
        {!e.isMember && <p className="text-sm text-muted">{t("membersOnly")}</p>}
      </Page>
      {!ended && (
        <ActionBar>
          {e.isMember ? (
            <>
              <ButtonLink href={e.meetingUrl} target="_blank" rel="noreferrer" size="lg" block icon="video" variant={e.live ? "primary" : "secondary"}>
                {t("join")}
              </ButtonLink>
              {e.live ? e.canClose && <CloseRoomButton projectId={id} eventId={eventId} /> : <AddToCalendar event={{ id: e.id, title: e.title, description: e.agenda, startsAt: e.startsAt, minutes: e.minutes, url: e.meetingUrl }} />}
            </>
          ) : (
            <ButtonLink href={`/rise-up/${id}`} size="lg" block>
              {t("joinProject")}
            </ButtonLink>
          )}
        </ActionBar>
      )}
    </>
  );
}

export default function EventPage({ params }: PageProps<"/[locale]/rise-up/[id]/evenements/[eventId]">) {
  return (
    <Suspense>
      <EventData params={params} />
    </Suspense>
  );
}
