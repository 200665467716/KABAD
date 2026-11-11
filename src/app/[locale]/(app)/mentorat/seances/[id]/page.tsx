import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { AnswerRequest } from "@/components/features/mentoring/AnswerRequest";
import { BookingSummary } from "@/components/features/mentoring/BookingSummary";
import { orNotFound } from "@/server/messaging";
import { getBooking } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { RateSession, Stars } from "./RateSession";
import { CopyLink, SessionActions } from "./SessionActions";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

/** Read once per request on the server: not a render-time clock. */
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.session");
  return { title: t("metaTitle") };
}

async function SessionData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/seances/${id}`);
  const b = await orNotFound(getBooking(user.id, id));
  if (!b) notFound();
  const t = await getTranslations("mentoring.session");
  const mentor = b.iAm === "MENTOR";
  const other = mentor ? b.mentee : b.mentor;
  const first = other.name.split(" ")[0];
  const future = isFuture(b.startsAt);
  const active = b.status === "PENDING" || b.status === "ACCEPTED";

  const title = {
    PENDING: mentor ? t("mentorPendingTitle") : t("pendingTitle"),
    ACCEPTED: t("acceptedTitle"),
    DECLINED: t("declinedTitle"),
    CANCELLED: t("cancelledTitle"),
  }[b.status];
  const text = {
    PENDING: mentor ? t("mentorPendingText", { name: first }) : t("pendingText", { name: other.name }),
    ACCEPTED: mentor ? t("mentorAcceptedText", { name: other.name }) : t("acceptedText", { name: other.name }),
    DECLINED: t("declinedText", { name: other.name }),
    CANCELLED: t("cancelledText"),
  }[b.status];

  return (
    <>
      <Page narrow className="gap-5">
        <div className="grid gap-2">
          <span className={`grid size-16 place-items-center rounded-lg shadow-pop ${b.status === "ACCEPTED" ? "bg-success text-on-success" : b.status === "PENDING" ? "bg-brand text-on-brand" : "bg-sunken text-ink"}`}>
            <Icon name={b.status === "ACCEPTED" ? "check" : b.status === "PENDING" ? "send" : "close"} size={24} />
          </span>
          <h2 className="font-display text-2xl font-extrabold uppercase">{title}</h2>
          <p className="text-[15px] leading-[22px]">{text}</p>
        </div>

        <Card className="gap-3">
          <Overline>{b.status === "ACCEPTED" ? t("theSession") : t("yours")}</Overline>
          <BookingSummary startsAt={b.startsAt} minutes={b.minutes} topic={b.topic} otherName={other.name} timeZone={user.timeZone} status={b.status} />
          {b.status === "ACCEPTED" && <p className="text-sm font-bold text-muted">{t("both", { name: other.name })}</p>}
          <div className="grid gap-1 border-t-2 border-line pt-3">
            <span className="text-xs font-extrabold tracking-[0.08em] text-muted uppercase">{mentor ? t("problem") : t("myProblem")}</span>
            <p className="text-sm">{b.problem}</p>
            {b.link && (
              <a href={b.link} target="_blank" rel="noreferrer" className="text-sm font-extrabold break-all">
                {t("link")} : {b.link.replace(/^https:\/\//, "")}
              </a>
            )}
          </div>
          {b.declineReason && <p className="text-sm text-muted">{t("reason", { reason: b.declineReason })}</p>}
        </Card>

        {b.status === "ACCEPTED" && b.meetingUrl && (
          <section className="grid gap-1.5">
            <Overline>{t("visio")}</Overline>
            <div className="flex items-center gap-2 rounded-md border-2 border-line-strong bg-raised py-1.5 pr-1.5 pl-3.5">
              <p className="min-w-0 flex-1 text-sm font-bold break-all">{b.meetingUrl.replace(/^https:\/\//, "")}</p>
              <CopyLink url={b.meetingUrl} />
            </div>
          </section>
        )}

        {/* After the session: the dev rates it once; both then read the mark. */}
        {b.canRate && <RateSession id={b.id} mentor={first} />}
        {b.rating !== null && (
          <Card className="gap-2">
            <Overline as="h3">{mentor ? t("ratingFrom", { name: first }) : t("ratingMine")}</Overline>
            <p className="flex items-center gap-2 font-extrabold text-brand-text">
              <Stars value={b.rating} />
              <span className="text-ink">{t("ratingValue", { rating: b.rating })}</span>
            </p>
            {b.ratingComment && <p className="text-sm whitespace-pre-line">« {b.ratingComment} »</p>}
          </Card>
        )}

        {b.status === "PENDING" && !mentor && (
          <section className="grid gap-3">
            <h3 className="font-display text-md font-extrabold uppercase">{t("next")}</h3>
            <ol className="grid gap-3">
              {[
                [t("step1Title"), t("step1Text")],
                [t("step2Title", { name: first }), t("step2Text")],
                [t("step3Title"), t("step3Text")],
              ].map(([a, c], i) => (
                <li key={a} className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3">
                  <span className={`grid size-8 place-items-center rounded-full font-display text-sm font-extrabold ${i === 0 ? "bg-success text-on-success" : "bg-ink text-accent"}`}>{i === 0 ? <Icon name="check" size={16} /> : i + 1}</span>
                  <p className="text-sm">
                    <b>{a}</b> {c}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </Page>
      <ActionBar>
        {b.status === "PENDING" && mentor && future ? (
          <AnswerRequest id={b.id} name={b.mentee.name} block />
        ) : (
          <>
            {b.status === "ACCEPTED" && b.meetingUrl && (
              <ButtonLink href={b.meetingUrl} target="_blank" rel="noreferrer" size="lg" icon="video" block>
                {t("join")}
              </ButtonLink>
            )}
            <SessionActions
              id={b.id}
              cancellable={active && future}
              calendar={b.status === "ACCEPTED" ? { startsAt: b.startsAt, minutes: b.minutes, title: t("calendarTitle", { name: other.name }), description: `${b.topic}\n\n${b.problem}`, url: b.meetingUrl } : null}
            />
            {!mentor && b.status !== "ACCEPTED" && (
              <ButtonLink href="/mentorat" variant="secondary" block>
                {t("otherMentors")}
              </ButtonLink>
            )}
          </>
        )}
      </ActionBar>
    </>
  );
}

export default async function SessionPage({ params }: PageProps<"/[locale]/mentorat/seances/[id]">) {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <SessionData params={params} />
      </Suspense>
    </>
  );
}
