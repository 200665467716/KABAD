import type { Metadata } from "next";
import Link from "next/link";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { MentoringProgress, MentoringTotal } from "@/components/features/MentoringProgress";
import { Avatar, AvatarGroup, Badge, CardLink, PrizeSplit, SectionHead } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { challenge, conversations, invitations, member, pair, tests } from "@/lib/data";
import { formatFCFA, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Accueil" };

export default function HomePage() {
  const mentor = member(pair.mentorId);
  const current = challenge("api-mobile-money")!;
  const group = conversations[0];
  const direct = conversations[1];

  return (
    <>
      <TopBar
        leading={<LogoMark size={32} className="lg:hidden" decorative />}
        title="Bonjour Kossi"
        subtitle={<span className="hidden lg:inline">Samedi 17 octobre · Votre séance avec Awa commence dans {pair.nextSession.inHours} h.</span>}
        actions={
          <>
            <IconButton icon="bell" label="Notifications, 4 nouvelles" dot href="/notifications" className="lg:hidden" />
            <Link href="/profil/kossi" aria-label="Mon profil" className="lg:hidden">
              <Avatar initials="KM" size="sm" tone="accent" />
            </Link>
          </>
        }
      />
      <Page className="lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="next" className="grid gap-3.5 rounded-lg bg-brand p-4 text-on-brand shadow-sm lg:col-span-2 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-5 lg:p-5">
          <div className="grid gap-3.5 lg:flex lg:items-center lg:gap-4">
            <div className="flex items-center justify-between lg:hidden">
              <p id="next" className="text-xs font-bold tracking-[0.08em] uppercase opacity-80">
                Prochaine séance de mentorat
              </p>
              <Badge tone="onBrand">Dans {pair.nextSession.inHours} h</Badge>
            </div>
            <div className="flex items-center gap-3 lg:gap-4">
              <Avatar initials={initials(mentor.name)} tone="solidAccent" className="lg:size-14 lg:text-lg" />
              <div className="grid">
                <p className="hidden text-xs font-bold tracking-[0.08em] uppercase opacity-80 lg:block">Prochaine séance</p>
                <span className="font-bold lg:font-display lg:text-xl">
                  {mentor.name}
                  <span className="hidden lg:inline"> · aujourd’hui, 19 h 00</span>
                </span>
                <span className="text-sm opacity-85">
                  <span className="lg:hidden">{pair.nextSession.when} · </span>
                  {pair.project}
                  <span className="hidden lg:inline"> · <MentoringTotal /> confirmées sur 6 h</span>
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 lg:flex">
            <ButtonLink href="/mentorat" variant="accent" icon="video">
              Rejoindre la visio
            </ButtonLink>
            <ButtonLink href="/mentorat" variant="onBrand">
              Espace
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="defi" className="grid content-start gap-3">
          <SectionHead id="defi" title="Votre défi en cours" action={<Link href="/defis" className="text-sm font-bold text-brand-text no-underline">Tous les défis</Link>} />
          <CardLink href={`/defis/${current.id}`}>
            <div className="flex items-center justify-between gap-2">
              <Badge tone="accent">Cagnotte</Badge>
              <span className="text-sm text-muted tabular">Clôture dans {current.closesIn}</span>
            </div>
            <h3 className="font-display text-lg font-bold">{current.title}</h3>
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xl font-bold tracking-[-0.02em] tabular">{formatFCFA(current.pot!)}</span>
              <span className="text-sm text-muted tabular">{current.participants} participants</span>
            </div>
            <PrizeSplit total={current.pot!} labels={["Gagnant", "Mentor", "KABAD"]} className="hidden lg:grid" />
            <MentoringProgress />
          </CardLink>
        </section>

        <section aria-labelledby="todo" className="grid content-start gap-3">
          <SectionHead id="todo" title="À faire" />
          <div className="divide-y divide-line rounded-lg border border-line bg-raised">
            <Link href="/messages?onglet=invitations" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
              <AvatarGroup>
                {invitations.map((i) => (
                  <Avatar key={i.id} initials={initials(member(i.fromId).name)} size="sm" />
                ))}
              </AvatarGroup>
              <span className="grid flex-1">
                <span className="font-bold">{invitations.length} invitations reçues</span>
                <span className="text-sm text-muted">Chidi et Fatou veulent échanger</span>
              </span>
              <Icon name="chevron" size={18} className="text-subtle" />
            </Link>
            <Link href={`/tests/${tests[0].id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
              <Avatar initials={<Icon name="check" size={16} />} size="sm" tone="success" />
              <span className="grid flex-1">
                <span className="font-bold">Tester « {tests[0].name} »</span>
                <span className="text-sm text-muted">Application d’un membre · {tests[0].minutes} min</span>
              </span>
              <Icon name="chevron" size={18} className="text-subtle" />
            </Link>
            <Link href={`/messages/${group.id}`} className="hidden min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline lg:flex">
              <Avatar initials="GA" size="sm" tone="neutral" square />
              <span className="grid min-w-0 flex-1">
                <span className="font-bold">Groupe {group.name}</span>
                <span className="truncate text-sm text-muted">Yao : {group.messages[1].text}</span>
              </span>
              <span className="h-5 min-w-5 rounded-full bg-brand px-1.5 text-center text-xs leading-5 text-on-brand tabular">{group.unread}</span>
            </Link>
            <Link href={`/messages/${direct.id}`} className="hidden min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline lg:flex">
              <Avatar initials="MT" size="sm" />
              <span className="grid min-w-0 flex-1">
                <span className="font-bold">{direct.name}</span>
                <span className="truncate text-sm text-muted">{direct.messages[direct.messages.length - 1].text}</span>
              </span>
              <span className="text-xs text-subtle tabular">{direct.when}</span>
            </Link>
          </div>
        </section>
      </Page>
    </>
  );
}
