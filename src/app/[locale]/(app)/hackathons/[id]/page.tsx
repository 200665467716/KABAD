import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, AvatarGroup, Badge, Overline, Ticket } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { AdminActions } from "@/components/features/hackathons/AdminActions";
import { useCountdown, useWhere } from "@/components/features/hackathons/HackathonTicket";
import { initials } from "@/lib/format";
import { levelIndex } from "@/lib/hackathon-form";
import type { HackathonDetail } from "@/lib/domain-types";
import { badgedMentors } from "@/server/admin";
import { getHackathon } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.detail");
  return { title: t("title") };
}

function Header({ h, now }: { h: HackathonDetail; now: number }) {
  const where = useWhere();
  const c = useCountdown()(h, now);
  return (
    <Ticket before={c.before} value={c.value} after={c.after} className="shadow-pop">
      <span className="text-xs font-extrabold tracking-[0.08em] text-brand-text uppercase">{where(h)}</span>
      <h2 className="font-display text-xl leading-7 font-extrabold">{h.title}</h2>
      <span className="flex items-center gap-2 text-[13px] text-muted">
        <Avatar initials={initials(h.organizerName)} size="sm" tone="neutral" />
        <span>
          {/* "par FinLab Cotonou" */}
          <ByLine name={h.organizerName} />
        </span>
      </span>
    </Ticket>
  );
}

async function ByLine({ name }: { name: string }) {
  const t = await getTranslations("hackathons");
  return (
    <>
      {t("by")} <b className="text-ink">{name}</b>
    </>
  );
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}`);
  const h = await orNotFound(getHackathon(user.id, id));
  if (!h) notFound();
  const [t, tt, to, format] = await Promise.all([getTranslations("hackathons.detail"), getTranslations("hackathons.team"), getTranslations("hackathons.organize"), getFormatter()]);
  // The level is stored with its French label: it is shown in the reader's language.
  const level = levelIndex(h.level);
  const mentors = user.isAdmin ? await badgedMentors(user.id) : [];
  const now = readClock();
  const hours = Math.round((new Date(h.endsAt).getTime() - new Date(h.startsAt).getTime()) / 3_600_000);
  const registrationsOpen = h.status === "OPEN" && new Date(h.closesAt).getTime() > now && h.published;
  const size = h.teamMax === 1 ? tt("solo") : h.teamMin === 1 ? tt("soloOrTeam") : tt("range", { min: h.teamMin, max: h.teamMax });
  const facts = [
    { label: t("dates"), value: format.dateTimeRange(new Date(h.startsAt), new Date(h.endsAt), { day: "numeric", month: "short" }) },
    { label: t("duration"), value: t("hours", { hours }) },
    { label: t("teams"), value: size },
    { label: t("registrations"), value: t("until", { date: format.dateTime(new Date(h.closesAt), { day: "numeric", month: "short" }) }) },
  ];

  return (
    <>
      <Page narrow>
        {!h.published && (
          <Alert tone="info" title={t("pendingTitle")}>
            {/* Besides its author and the KABAD team, only a mentor offered a mission sees it. */}
            {h.canEdit || user.isAdmin ? t("pendingText") : t("pendingMentorText")}
          </Alert>
        )}
        <Header h={h} now={now} />

        <dl className="m-0 grid grid-cols-2 gap-2.5">
          {facts.map((f) => (
            <div key={f.label} className="grid gap-0.5 rounded-action border-2 border-line-strong bg-raised px-3.5 py-3">
              <dt className="text-xs font-extrabold tracking-[0.08em] text-brand-text uppercase">{f.label}</dt>
              <dd className="m-0 font-extrabold">{f.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="challenge" className="grid gap-2">
          <Overline as="h2" id="challenge">
            {t("challenge")}
          </Overline>
          <p className="text-[15px] leading-[22px] whitespace-pre-line">{h.description}</p>
          <p className="text-sm text-muted">
            {level === null ? h.level : to(`levels.${level}`)} · {h.stack}
          </p>
          {h.rulesUrl && (
            <a href={h.rulesUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-extrabold">
              {t("rules")} <Icon name="external" size={16} />
            </a>
          )}
        </section>

        <section aria-labelledby="prizes" className="grid gap-2">
          <Overline as="h2" id="prizes">
            {t("prizes")}
          </Overline>
          {h.prizes.length > 0 ? (
            <ol className="m-0 grid list-none gap-2 p-0">
              {h.prizes.map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-action border-2 border-line-strong bg-raised px-3.5 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-extrabold text-accent">{i + 1}</span>
                  <span className="font-bold">{p}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">{t("noPrize")}</p>
          )}
          {h.prizes.length > 0 && <p className="text-[13px] text-muted">{t("prizeOrder")}</p>}
        </section>

        {h.instructorsList.length > 0 && (
          <section aria-labelledby="instructors" className="flex items-center gap-3">
            <AvatarGroup>
              {h.instructorsList.map((m) => (
                <Avatar key={m.id} initials={initials(m.name)} size="sm" />
              ))}
            </AvatarGroup>
            <p id="instructors" className="text-sm">
              <b>{t("instructorsCount", { count: h.instructorsList.length })}</b> {t("instructorsText", { count: h.instructorsList.length })}
            </p>
          </section>
        )}

        {h.jury.length > 0 && (
          <p className="text-sm text-muted">
            <b className="text-ink">{t("jury")}</b> {h.jury.map((j) => j.name).join(", ")}
          </p>
        )}

        <p className="text-sm text-muted">{t("entries", { teams: h.teams, participants: h.participants })}</p>

        {(h.canEdit || user.isAdmin) && (
          <section aria-labelledby="manage" className="grid gap-3 rounded-lg border-2 border-dashed border-line-strong p-4">
            <Overline as="h2" id="manage">
              {t("manage")}
            </Overline>
            {h.canEdit && h.instructorFee ? (
              <ButtonLink href={`/hackathons/${h.id}/instructeurs`} variant="secondary" size="sm" icon="users" className="justify-self-start">
                {t("recruit")}
              </ButtonLink>
            ) : null}
            {user.isAdmin && <AdminActions id={h.id} status={h.status} published={h.published} mentors={mentors} jury={h.jury.map((j) => j.id)} />}
          </section>
        )}
      </Page>
      <ActionBar>
        {h.myTeam ? (
          <ButtonLink href={`/hackathons/${h.id}/equipe`} size="lg" block>
            {h.myTeam.solo ? t("myEntry") : t("myTeam")}
          </ButtonLink>
        ) : h.amJuror && h.status === "JURY" ? (
          <ButtonLink href={`/hackathons/${h.id}/jury`} size="lg" block>
            {t("judge")}
          </ButtonLink>
        ) : h.status === "DONE" ? (
          <ButtonLink href={`/hackathons/${h.id}/resultats`} size="lg" block>
            {t("seeResults")}
          </ButtonLink>
        ) : registrationsOpen && !h.amJuror ? (
          <ButtonLink href={`/hackathons/${h.id}/participer`} size="lg" block>
            {t("join")}
          </ButtonLink>
        ) : (
          <Badge className="justify-self-center">{h.amJuror ? t("youJudge") : !h.published ? t("notPublished") : t("closed")}</Badge>
        )}
      </ActionBar>
    </>
  );
}

export default async function HackathonPage({ params }: PageProps<"/[locale]/hackathons/[id]">) {
  const t = await getTranslations("hackathons.detail");
  return (
    <>
      <TopBar back="/hackathons" title={t("title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <Data params={params} />
      </Suspense>
    </>
  );
}
