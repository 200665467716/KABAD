import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Avatar, AvatarGroup, Badge, Card, SectionLink, Ticket, TimeBlock } from "@/components/ui/Display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import type { HackathonSummary } from "@/lib/domain-types";
import { initials } from "@/lib/format";
import { listTestApps } from "@/server/community-tests";
import { listHackathons, myEntries, myMissions } from "@/server/hackathons";
import { recommendations } from "@/server/members";
import { myBookings } from "@/server/mentoring";
import { listInvitations } from "@/server/messaging";
import { unreadNotifications } from "@/server/notifications";
import { pageUser } from "@/server/page";
import { listProjects } from "@/server/rise";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("home"))("title") };
}

const DAY = 86_400_000;

function TodoRow({ href, icon, title, text }: { href: string; icon: IconName; title: string; text: string }) {
  return (
    <Link href={href} className="group flex min-h-14 items-center gap-3 px-3.5 py-3 text-ink no-underline transition-colors duration-150 hover:bg-bg active:bg-sunken">
      <Avatar initials={<Icon name={icon} size={18} />} size="md" tone="brand" />
      <span className="grid min-w-0 flex-1">
        <span className="font-extrabold">{title}</span>
        <span className="truncate text-[13px] text-muted">{text}</span>
      </span>
      <Icon name="chevron" size={18} className="text-subtle transition-transform duration-200 ease-kb group-hover:translate-x-1" />
    </Link>
  );
}

/** "48 h · équipes de 2 à 5 · instructeurs". */
async function hackathonLine(h: HackathonSummary) {
  const t = await getTranslations("home.hackathonLine");
  const hours = Math.round((new Date(h.endsAt).getTime() - new Date(h.startsAt).getTime()) / 3600_000);
  const team = h.teamMax === 1 ? t("solo") : h.teamMin === 1 ? t("soloOrTeam") : t("teams", { min: h.teamMin, max: h.teamMax });
  return [t("hours", { hours }), team, h.instructors > 0 ? t("instructors") : null].filter(Boolean).join(" · ");
}

async function HomeData() {
  const user = await pageUser("/accueil");
  const [t, tWhy, format] = await Promise.all([getTranslations("home"), getTranslations("auth.suggestions.why"), getFormatter()]);
  const [bookings, hackathons, entries, projects, tests, people, invitations, bell, missions] = await Promise.all([
    myBookings(user.id),
    listHackathons(user.id),
    myEntries(user.id),
    listProjects(user.id),
    listTestApps(user.id),
    recommendations(user.id),
    listInvitations(user.id),
    unreadNotifications(user.id),
    user.seniorVerifiedAt ? myMissions(user.id) : Promise.resolve([]),
  ]);
  const now = new Date();
  const next = bookings.upcoming[0] ?? null;
  const other = next ? (next.iAm === "MENTEE" ? next.mentor : next.mentee) : null;
  const project = projects[0] ?? null;
  const open = hackathons.filter((h) => h.status === "OPEN" && new Date(h.endsAt) > now).slice(0, 2);
  const entry = entries.find((e) => e.status === "OPEN") ?? null;
  const toTest = tests.toTest.filter((a) => a.slotsLeft > 0).slice(0, 2);
  const proposed = missions.filter((m) => m.status === "PROPOSED");
  const first = user.name.split(/\s+/)[0];
  const received = invitations.received;

  const todos: ReactNode[] = [];
  if (received.length > 0) {
    const names = received.slice(0, 2).map((i) => i.from.name.split(" ")[0]);
    todos.push(
      <TodoRow key="inv" href="/messages/invitations" icon="userPlus" title={t("todoInvitations", { count: received.length })} text={names.length > 1 ? t("todoInvitationsText", { names: format.list(names) }) : t("todoInvitationsTextOne", { name: names[0] })} />,
    );
  }
  if (bookings.toAnswer.length > 0) todos.push(<TodoRow key="req" href="/mentorat/demandes" icon="clock" title={t("todoRequests", { count: bookings.toAnswer.length })} text={t("todoRequestsText")} />);
  if (proposed.length > 0) todos.push(<TodoRow key="mis" href={`/hackathons/missions/${proposed[0].id}`} icon="trophy" title={t("todoMission", { count: proposed.length })} text={t("todoMissionText")} />);

  return (
    <>
      <TopBar
        leading={
          <Link href="/profil" aria-label={t("myProfile")} className="grid size-11 shrink-0 place-items-center no-underline lg:hidden">
            <Avatar initials={initials(user.name)} size="sm" tone="accent" />
          </Link>
        }
        title={t("hello", { name: first })}
        subtitle={format.dateTime(now, { weekday: "short", day: "numeric", month: "short", timeZone: user.timeZone })}
        actions={
          <>
            <IconButton icon="search" label={t("search")} href="/membres" />
            <IconButton icon="bell" label={bell ? t("notificationsNew", { count: bell }) : t("notifications")} dot={bell > 0} href="/notifications" className="lg:hidden" />
          </>
        }
      />
      <Page className="kb-stagger lg:grid-cols-2 lg:gap-6">
        {todos.length > 0 && <div className="divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised lg:col-span-2">{todos}</div>}

        {next && other ? (
          <Card featured className="gap-3.5 lg:col-span-2" aria-labelledby="home-next">
            <div className="flex items-center justify-between gap-3">
              <p id="home-next" className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">
                {next.iAm === "MENTEE" ? t("session.kicker") : t("session.kickerMentor")}
              </p>
              <Badge tone="success">{t("session.confirmed")}</Badge>
            </div>
            <div className="flex items-center gap-3.5">
              <TimeBlock time={format.dateTime(new Date(next.startsAt), { hour: "numeric", minute: "2-digit", timeZone: user.timeZone })} length={t("session.length", { minutes: next.minutes })} />
              <div className="grid min-w-0 gap-1.5">
                <Link href={`/mentorat/seances/${next.id}`} className="text-md font-extrabold text-ink no-underline">
                  {next.topic}
                </Link>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Avatar initials={initials(other.name)} size="sm" tone="neutral" />
                  <span>
                    <b className="text-ink">{other.name}</b>
                    {other.city ? ` · ${other.city}` : ""}
                  </span>
                </span>
              </div>
            </div>
            {next.meetingUrl ? (
              <a href={next.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center justify-center gap-2 rounded-action bg-brand px-6 font-extrabold text-on-brand no-underline hover:bg-brand-hover">
                <Icon name="video" size={18} />
                {t("session.joinIn", { when: format.relativeTime(new Date(next.startsAt), now) })}
              </a>
            ) : (
              <ButtonLink href={`/mentorat/seances/${next.id}`} size="lg">
                {t("session.details")}
              </ButtonLink>
            )}
          </Card>
        ) : (
          <Card className="gap-3 lg:col-span-2">
            <p className="text-xs font-extrabold tracking-[0.1em] text-brand-text uppercase">{t("session.kicker")}</p>
            <p className="font-display text-md font-extrabold uppercase">{t("noSession.title")}</p>
            <p className="text-sm text-muted">{t("noSession.text")}</p>
            <ButtonLink href="/mentorat" size="lg">
              {t("noSession.cta")}
            </ButtonLink>
          </Card>
        )}

        <section aria-labelledby="home-rise" className="grid content-start gap-3">
          <SectionLink id="home-rise" title={t("rise.title")} href="/rise-up" label={t("rise.seeAll")} />
          {project ? (
            <div className="grid gap-2.5 rounded-lg border-2 border-line-strong bg-accent p-4 text-[var(--ink)]">
              <div className="flex items-center justify-between gap-3">
                {project.event?.live ? (
                  <Badge tone="live">{t("rise.live")}</Badge>
                ) : project.event ? (
                  <Badge tone="live">{t("rise.next", { when: format.dateTime(new Date(project.event.startsAt), { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: user.timeZone }) })}</Badge>
                ) : (
                  <span />
                )}
                <Icon name="rise" className="size-10" />
              </div>
              <Link href={`/rise-up/${project.id}`} className="text-md font-extrabold text-[var(--ink)] no-underline">
                {project.name}
              </Link>
              <p className="text-sm font-semibold text-[var(--maize-deep)]">{project.summary}</p>
              <div className="flex items-center gap-2.5">
                <AvatarGroup className="[&>*]:shadow-[0_0_0_2px_var(--maize)]">
                  {project.avatars.map((a) => (
                    <Avatar key={a.id} initials={initials(a.name)} size="sm" tone="brand" />
                  ))}
                </AvatarGroup>
                <span className="text-[13px] font-extrabold">
                  {t("rise.stats", { count: project.members })}
                  {project.countries > 0 ? ` · ${t("rise.countries", { count: project.countries })}` : ""}
                </span>
              </div>
              <ButtonLink href={project.event?.live ? `/rise-up/${project.id}/evenements/${project.event.id}` : `/rise-up/${project.id}`} variant="ink">
                {project.event?.live ? t("rise.joinRoom") : t("rise.open")}
              </ButtonLink>
            </div>
          ) : (
            <Card className="gap-3">
              <p className="text-sm text-muted">{t("rise.empty")}</p>
              <ButtonLink href="/rise-up/nouveau" variant="secondary">
                {t("rise.create")}
              </ButtonLink>
            </Card>
          )}
        </section>

        <section aria-labelledby="home-hack" className="grid content-start gap-3">
          <SectionLink id="home-hack" title={t("hackathons.title")} href="/hackathons" label={t("hackathons.seeAll")} />
          {entry && (
            <Link href={`/hackathons/${entry.hackathonId}/equipe`} className="flex items-center gap-3 rounded-lg bg-header px-3.5 py-3 text-on-header no-underline transition-[translate,box-shadow] duration-200 ease-kb hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 active:shadow-none">
              <Avatar initials={initials(entry.team)} size="md" tone="accent" square />
              <span className="grid min-w-0 flex-1">
                <span className="font-extrabold">{entry.solo ? t("hackathons.myTeamSolo") : t("hackathons.myTeam", { team: entry.team })}</span>
                <span className="truncate text-[13px] text-on-header-muted">{t("hackathons.dueIn", { title: entry.title, when: format.relativeTime(new Date(entry.endsAt), now) })}</span>
              </span>
              <Icon name="chevron" size={18} />
            </Link>
          )}
          {open.length === 0 && <p className="text-sm text-muted">{t("hackathons.empty")}</p>}
          {await Promise.all(
            open.map(async (h) => {
              const days = Math.max(0, Math.ceil((new Date(h.startsAt).getTime() - now.getTime()) / DAY));
              const started = new Date(h.startsAt) <= now;
              return (
                <Ticket key={h.id} href={`/hackathons/${h.id}`} before={started ? "" : t("hackathons.in")} value={started ? "●" : days} after={started ? t("hackathons.now") : t("hackathons.days", { count: days })}>
                  <span className="text-xs font-extrabold tracking-[0.08em] text-brand-text uppercase">{[t(`formats.${h.format}`), h.city].filter(Boolean).join(" · ")}</span>
                  <span className="font-display text-base leading-[21px] font-bold">{h.title}</span>
                  <span className="text-[13px] text-muted">{t.rich("hackathons.by", { name: h.organizerName, b: (c) => <b className="text-ink">{c}</b> })}</span>
                  <span className="text-[13px] text-muted">{await hackathonLine(h)}</span>
                </Ticket>
              );
            }),
          )}
        </section>

        {toTest.length > 0 && (
          <section aria-labelledby="home-tests" className="grid content-start gap-3">
            <SectionLink id="home-tests" title={t("tests.title")} href="/tests" label={t("tests.seeAll")} />
            <div className="divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
              {toTest.map((a) => (
                <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                  <div className="grid min-w-0 gap-0.5">
                    <span className="font-extrabold">{a.name}</span>
                    <span className="truncate text-[13px] text-muted">{t("tests.by", { name: a.owner.name })}</span>
                    <span className="text-xs font-extrabold text-brand-text">{t("tests.places", { count: a.slotsLeft, minutes: a.minutes })}</span>
                  </div>
                  <ButtonLink href={`/tests/${a.id}`} variant="secondary" size="sm" aria-label={t("tests.testAria", { name: a.name })}>
                    {t("tests.test")}
                  </ButtonLink>
                </div>
              ))}
            </div>
          </section>
        )}

        {people.length > 0 && (
          <section aria-labelledby="home-devs" className="grid content-start gap-3">
            <SectionLink id="home-devs" title={t("devs.title")} href="/membres" label={t("devs.seeAll")} />
            <div className="no-scrollbar -mr-4 flex gap-3 overflow-x-auto pr-4 lg:mr-0 lg:pr-0">
              {people.slice(0, 4).map((p) => (
                <Link key={p.id} href={`/profil/${p.id}`} className="grid w-40 shrink-0 content-start justify-items-start gap-2.5 rounded-lg border-2 border-line-strong bg-raised p-3.5 text-ink no-underline">
                  <Avatar initials={initials(p.name)} size="lg" tone={p.verified ? "brand" : "neutral"} />
                  <span className="grid gap-0.5">
                    <span className="font-extrabold">{p.name}</span>
                    <span className="text-[13px] text-muted">{[p.headline, p.city].filter(Boolean).join(" · ")}</span>
                  </span>
                  {p.verified && <Badge tone="brand">{t("devs.mentor")}</Badge>}
                  <span className="text-xs font-extrabold text-brand-text">{tWhy(p.why.key, { tech: p.why.tech ?? "" })}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Page>
    </>
  );
}

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <HomeData />
    </Suspense>
  );
}
