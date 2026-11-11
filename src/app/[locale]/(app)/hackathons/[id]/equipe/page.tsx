import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Overline, Tag } from "@/components/ui/Display";
import { ActionButton } from "@/components/features/hackathons/ActionButton";
import { TeamDiscussionButton } from "@/components/features/hackathons/TeamDiscussionButton";
import { TeamPanel } from "@/components/features/hackathons/TeamPanel";
import { redirect } from "@/i18n/navigation";
import { initials, teamTitle } from "@/lib/format";
import { getHackathon } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.team");
  return { title: t("title") };
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/equipe`);
  const h = await orNotFound(getHackathon(user.id, id));
  if (!h) notFound();
  if (!h.myTeam) redirect({ href: `/hackathons/${id}`, locale: await getLocale() });
  const team = h.myTeam!;
  const [t, format] = await Promise.all([getTranslations("hackathons.team"), getFormatter()]);
  const now = readClock();
  const end = new Date(h.endsAt).getTime();
  const left = Math.max(0, end - now);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const started = new Date(h.startsAt).getTime() <= now;
  const canChange = h.status === "OPEN" && new Date(h.closesAt).getTime() > now;
  const canSubmit = h.status === "OPEN" && started && team.members.length >= h.teamMin;

  return (
    <>
      <TopBar back={`/hackathons/${id}`} title={team.solo ? t("titleSolo") : t("title")} actions={team.solo ? undefined : <TeamDiscussionButton teamId={team.id} conversationId={team.conversationId} label={t("discussion")} />} />
      <Page narrow>
        <Card featured className="gap-3">
          <div className="flex items-center gap-3">
            <Avatar initials={initials(team.name)} size="lg" square tone="brand" />
            <div className="grid min-w-0">
              <h2 className="truncate font-display text-lg font-extrabold">{team.solo ? team.name : teamTitle(team.name, t("teamWord"))}</h2>
              <span className="text-[13px] text-muted">{team.solo ? h.title : t("count", { title: h.title, count: team.members.length, max: h.teamMax })}</span>
            </div>
          </div>
          {h.status === "OPEN" && (
            <div className="flex items-center gap-3 rounded-action bg-ink p-3 text-raised">
              <span className="font-display text-2xl font-extrabold text-accent tabular">{t("daysShort", { days })}</span>
              <span className="font-display text-2xl font-extrabold text-accent tabular">{t("hoursShort", { hours })}</span>
              <span className="grid text-xs">
                <b className="tracking-[0.08em] uppercase">{t("due")}</b>
                <span className="text-[var(--grey-light)]">{format.dateTime(new Date(h.endsAt), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </span>
            </div>
          )}
          {team.submission ? (
            <Badge tone="success">{t("submitted", { when: format.relativeTime(new Date(team.submission.updatedAt), now) })}</Badge>
          ) : (
            <p className="text-sm text-muted">{t("whatToSend")}</p>
          )}
        </Card>

        {!started && h.status === "OPEN" && <Alert tone="info">{t("notStarted", { date: format.dateTime(new Date(h.startsAt), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) })}</Alert>}
        {team.members.length < h.teamMin && <Alert tone="info">{t("tooSmall", { min: h.teamMin })}</Alert>}

        <section aria-labelledby="members" className="grid gap-2">
          <Overline as="h2" id="members">
            {t("members")}
          </Overline>
          <ul className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
            {team.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                <Avatar initials={initials(m.name)} tone={m.id === user.id ? "accent" : "brand"} />
                <span className="grid min-w-0 flex-1">
                  <b className="truncate">
                    {m.name}
                    {m.id === user.id ? ` ${t("you")}` : ""}
                  </b>
                  <span className="truncate text-[13px] text-muted">
                    {m.city}
                    {m.id === team.captainId && !team.solo ? ` · ${t("captain")}` : ""}
                  </span>
                </span>
                {m.skill && <Tag>{m.skill}</Tag>}
              </li>
            ))}
            {/* H3: teammates the captain invited, until they answer. */}
            {team.invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-3.5 py-3">
                <Avatar initials={initials(i.user.name)} tone="neutral" />
                <span className="grid min-w-0 flex-1">
                  <b className="truncate">{i.user.name}</b>
                  <span className="truncate text-[13px] text-muted">{t("inviteSent")}</span>
                </span>
                <ActionButton url={`/api/team-requests/${i.id}`} method="DELETE" variant="ghost" size="sm">
                  {t("inviteCancel")}
                </ActionButton>
              </li>
            ))}
          </ul>
        </section>

        <TeamPanel team={team} meId={user.id} hackathonId={id} canChange={canChange} full={team.members.length >= h.teamMax} placesLeft={Math.max(0, h.teamMax - team.members.length - team.invites.length)} />
      </Page>
      {(canSubmit || team.submission) && (
        <ActionBar>
          {canSubmit ? (
            <ButtonLink href={`/hackathons/${id}/soumettre`} size="lg" block>
              {team.submission ? t("editSubmission") : t("submit")}
            </ButtonLink>
          ) : (
            <Badge tone="success" className="justify-self-center">
              {t("locked")}
            </Badge>
          )}
        </ActionBar>
      )}
    </>
  );
}

export default async function TeamPage({ params }: PageProps<"/[locale]/hackathons/[id]/equipe">) {
  const t = await getTranslations("hackathons.team");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <Data params={params} />
    </Suspense>
  );
}
