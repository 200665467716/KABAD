import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { prizeOf } from "@/components/features/ChallengeCard";
import { MentoringProgress } from "@/components/features/MentoringProgress";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Avatar, AvatarGroup, Badge, CardLink, PrizeSplit, SectionHead } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, initials } from "@/lib/format";
import { sessionWhen, shortTime, timeLeft } from "@/lib/time";
import { listChallenges } from "@/server/challenges";
import { listTestApps } from "@/server/community-tests";
import { db } from "@/server/db";
import { eligibility, listRequests, myPairs } from "@/server/mentoring";
import { listConversations, listInvitations } from "@/server/messaging";
import { unreadNotifications } from "@/server/notifications";
import { pageUser } from "@/server/page";
import { listRooms } from "@/server/rooms";
import { salonsEnabled } from "@/lib/features";

export const metadata: Metadata = { title: "Accueil" };

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`);

function TodoRow({ href, avatar, title, text, trailing, className }: { href: string; avatar: React.ReactNode; title: string; text: string; trailing?: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline ${className ?? ""}`}>
      {avatar}
      <span className="grid min-w-0 flex-1">
        <span className="font-bold">{title}</span>
        <span className="truncate text-sm text-muted">{text}</span>
      </span>
      {trailing ?? <Icon name="chevron" size={18} className="text-subtle" />}
    </Link>
  );
}

async function HomeData() {
  const user = await pageUser("/accueil");
  const [pairs, e, challenges, invitations, requests, tests, conversations, bell, mySubmissions, rooms] = await Promise.all([
    myPairs(user.id),
    eligibility(user.id),
    listChallenges(),
    listInvitations(user.id),
    listRequests(user.id),
    listTestApps(user.id),
    listConversations(user.id),
    unreadNotifications(user.id),
    db.submission.findMany({ where: { userId: user.id }, select: { challengeId: true } }),
    salonsEnabled ? listRooms(user.id) : null,
  ]);
  const first = user.name.split(" ")[0];
  const pair = pairs.find((p) => p.iAm === "MENTEE") ?? pairs[0] ?? null;
  const other = pair ? (pair.iAm === "MENTOR" ? pair.mentee : pair.mentor) : null;
  const open = challenges.filter((c) => c.status === "OPEN");
  const mine = new Set(mySubmissions.map((s) => s.challengeId));
  const current = open.find((c) => mine.has(c.id)) ?? open[0] ?? null;
  const received = invitations.received;
  const toTest = tests.toTest.find((t) => !t.myReport && t.slotsLeft > 0) ?? null;
  const unreadConversations = conversations.filter((c) => c.unread > 0).slice(0, 2);

  return (
    <>
      <TopBar
        leading={
          <span className="lg:hidden">
            <Avatar initials={initials(user.name)} size="sm" tone="accent" />
          </span>
        }
        title={`Bonjour ${first}`}
        subtitle={pair?.nextSessionAt && other ? <span className="hidden lg:inline">Prochaine séance avec {other.name.split(" ")[0]} : {sessionWhen(pair.nextSessionAt)}.</span> : undefined}
        actions={
          <>
            <IconButton icon="bell" label={bell ? `Notifications, ${bell} nouvelle${bell > 1 ? "s" : ""}` : "Notifications"} dot={bell > 0} href="/notifications" className="lg:hidden" />
            <Link href={`/profil/${user.id}`} aria-label="Mon profil" className="lg:hidden">
              <Icon name="user" />
            </Link>
          </>
        }
      />
      <Page className="lg:grid-cols-2 lg:gap-6">
        {pair && other ? (
          <section aria-labelledby="next" className="grid gap-3.5 rounded-lg bg-brand p-4 text-on-brand shadow-sm lg:col-span-2 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-5 lg:p-5">
            <div className="grid gap-3.5 lg:flex lg:items-center lg:gap-4">
              <p id="next" className="text-xs font-bold tracking-[0.08em] uppercase opacity-80 lg:hidden">
                {pair.nextSessionAt ? "Prochaine séance de mentorat" : "Votre binôme"}
              </p>
              <div className="flex items-center gap-3 lg:gap-4">
                <Avatar initials={initials(other.name)} tone="solidAccent" className="lg:size-14 lg:text-lg" />
                <div className="grid">
                  <span className="font-bold lg:font-display lg:text-xl">{other.name}</span>
                  <span className="text-sm opacity-85">
                    {pair.nextSessionAt ? `${sessionWhen(pair.nextSessionAt)} · ` : "Prochaine séance à planifier · "}
                    {pair.project}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 lg:flex">
              <ButtonLink href={pair.visioUrl} variant="accent" icon="video" target="_blank" rel="noreferrer">
                Rejoindre la visio
              </ButtonLink>
              <ButtonLink href="/mentorat" variant="onBrand">
                Espace
              </ButtonLink>
            </div>
          </section>
        ) : (
          <section className="grid gap-3 rounded-lg bg-brand p-4 text-on-brand lg:col-span-2 lg:p-5">
            <p className="font-display text-lg font-bold">{user.role === "SENIOR" ? "Accompagnez un junior sur son vrai projet" : "Trouvez un mentor pour votre projet"}</p>
            <p className="text-sm opacity-85">
              {user.role === "SENIOR" ? "Les juniors vous trouvent dans « Trouver un mentor ». Leurs demandes arrivent dans votre espace mentorat." : "Un senior vous accompagne en visio. 6 h confirmées ouvrent les défis à cagnotte."}
            </p>
            <ButtonLink href={user.role === "SENIOR" ? "/mentorat" : "/mentorat/mentors"} variant="accent" className="justify-self-start">
              {user.role === "SENIOR" ? "Mon espace mentorat" : "Trouver un mentor"}
            </ButtonLink>
          </section>
        )}

        {current && (
          <section aria-labelledby="defi" className="grid content-start gap-3">
            <SectionHead id="defi" title={mine.has(current.id) ? "Votre défi en cours" : "Défi ouvert"} action={<Link href="/defis" className="text-sm font-bold text-brand-text no-underline">Tous les défis</Link>} />
            <CardLink href={`/defis/${current.id}`}>
              <div className="flex items-center justify-between gap-2">
                <Badge tone="accent">{current.kind === "LOT" ? "Lot" : current.kind === "SPONSORISE" ? "Sponsorisé" : "Cagnotte"}</Badge>
                <span className="text-sm text-muted tabular">Clôture dans {timeLeft(current.closesAt)}</span>
              </div>
              <h3 className="font-display text-lg font-bold">{current.title}</h3>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xl font-bold tracking-[-0.02em] tabular">{prizeOf(current)}</span>
                <span className="text-sm text-muted tabular">
                  {current.participants} participant{current.participants > 1 ? "s" : ""}
                </span>
              </div>
              {current.kind !== "LOT" && <PrizeSplit total={current.pot} labels={["Gagnant", "Mentor", "KABAD"]} className="hidden lg:grid" />}
              {current.requiresMentoring && user.role === "JUNIOR" && <MentoringProgress eligibility={e} />}
            </CardLink>
          </section>
        )}

        <section aria-labelledby="todo" className="grid content-start gap-3">
          <SectionHead id="todo" title="À faire" />
          <div className="divide-y divide-line rounded-lg border-2 border-line-strong bg-raised">
            {received.length > 0 && (
              <TodoRow
                href="/messages?onglet=invitations"
                avatar={
                  <AvatarGroup>
                    {received.slice(0, 3).map((i) => (
                      <Avatar key={i.id} initials={initials(i.from.name)} size="sm" />
                    ))}
                  </AvatarGroup>
                }
                title={`${received.length} invitation${received.length > 1 ? "s" : ""} reçue${received.length > 1 ? "s" : ""}`}
                text={`${names(received.slice(0, 3).map((i) => i.from.name.split(" ")[0]))} veu${received.length > 1 ? "lent" : "t"} échanger`}
              />
            )}
            {requests.received.length > 0 && (
              <TodoRow
                href="/mentorat#demandes"
                avatar={<Avatar initials={<Icon name="user" size={16} />} size="sm" tone="accent" />}
                title={`${requests.received.length} demande${requests.received.length > 1 ? "s" : ""} de mentorat`}
                text={names(requests.received.map((r) => r.mentee.name.split(" ")[0]))}
              />
            )}
            {pair?.sessions.some((s) => (pair.iAm === "MENTOR" ? !s.confirmedByMentor : !s.confirmedByMentee)) && (
              <TodoRow
                href={`/mentorat/seances/${pair.sessions.find((s) => (pair.iAm === "MENTOR" ? !s.confirmedByMentor : !s.confirmedByMentee))!.id}`}
                avatar={<Avatar initials={<Icon name="clock" size={16} />} size="sm" tone="brand" />}
                title="Une séance à confirmer"
                text={`Elle compte quand vous l’avez confirmée tous les deux · ${user.role === "JUNIOR" ? `${formatDuration(e.confirmed)} confirmées` : pair.project}`}
              />
            )}
            {toTest && (
              <TodoRow href={`/tests/${toTest.id}`} avatar={<Avatar initials={<Icon name="check" size={16} />} size="sm" tone="success" />} title={`Tester « ${toTest.name} »`} text={`Application de ${toTest.owner.name.split(" ")[0]} · ${toTest.minutes} min`} />
            )}
            {unreadConversations.map((c) => (
              <TodoRow
                key={c.id}
                href={`/messages/${c.id}`}
                avatar={<Avatar initials={c.kind === "GROUP" ? <Icon name="users" size={16} /> : initials(c.title)} size="sm" tone={c.kind === "GROUP" ? "neutral" : "brand"} square={c.kind === "GROUP"} />}
                title={c.kind === "GROUP" ? `Groupe ${c.title}` : c.title}
                text={c.last ? `${c.last.authorName && c.kind === "GROUP" ? `${c.last.authorName.split(" ")[0]} : ` : ""}${c.last.body}` : ""}
                trailing={
                  <span className="grid justify-items-end gap-1">
                    <span className="text-xs text-subtle tabular">{shortTime(c.lastMessageAt)}</span>
                    <span className="h-5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 text-on-brand tabular" aria-label={`${c.unread} non lus`}>
                      {c.unread}
                    </span>
                  </span>
                }
              />
            ))}
            {rooms?.live.slice(0, 2).map((r) => (
              <TodoRow key={r.id} href={`/salons/${r.id}`} avatar={<Avatar initials={<Icon name="radio" size={16} />} size="sm" tone="accent" />} title={`En direct : ${r.title}`} text={`Salon vocal de ${r.host.name} · ${r.listeners} présent${r.listeners > 1 ? "s" : ""}`} />
            ))}
            {rooms && rooms.live.length === 0 && rooms.upcoming[0] && (
              <TodoRow href={`/salons/${rooms.upcoming[0].id}`} avatar={<Avatar initials={<Icon name="radio" size={16} />} size="sm" tone="neutral" />} title={`Salon vocal : ${rooms.upcoming[0].title}`} text={`${sessionWhen(rooms.upcoming[0].startsAt)} · avec ${rooms.upcoming[0].host.name}`} />
            )}
            <TodoRow href="/membres" avatar={<Avatar initials={<Icon name="userPlus" size={16} />} size="sm" tone="neutral" />} title="Rencontrer des développeurs" text="Cherchez par technologie, ville ou pays, et invitez" />
          </div>
        </section>
      </Page>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <HomeData />
    </Suspense>
  );
}
