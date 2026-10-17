import type { Metadata } from "next";
import Link from "next/link";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { MentoringProgress } from "@/components/features/MentoringProgress";
import { SessionJournal } from "@/components/features/SessionJournal";
import { Avatar, AvatarGroup, Card, Overline, SectionHead } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { member, pair } from "@/lib/data";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Mentorat" };

export default function PairPage() {
  const mentor = member(pair.mentorId);
  return (
    <>
      <TopBar
        leading={
          <AvatarGroup className="mr-1">
            <Avatar initials={initials(mentor.name)} size="sm" />
            <Avatar initials="KM" size="sm" tone="accent" />
          </AvatarGroup>
        }
        title={`Binôme avec ${mentor.name.split(" ")[0]}`}
        subtitle={`Depuis le ${pair.since}`}
        actions={<IconButton icon="search" label="Trouver un mentor" href="/mentorat/mentors" />}
      />
      <Page className="lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <Card className="content-start gap-3">
          <div className="flex items-center justify-between">
            <Overline>Projet</Overline>
            <a href={`https://${pair.repo}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-text no-underline" target="_blank" rel="noreferrer">
              <Icon name="code" size={16} />
              Dépôt
            </a>
          </div>
          <h2 className="font-display text-lg font-bold">{pair.project}</h2>
          <MentoringProgress variant="pair" />
          <ButtonLink href="https://meet.jit.si/kabad-awa-kossi" icon="video" block target="_blank" rel="noreferrer">
            Démarrer une séance en visio
          </ButtonLink>
          <p className="text-xs text-muted">Écran partagé sur Jitsi Meet. Pas de durée imposée : vous fixez le rythme à deux.</p>
        </Card>

        <section className="grid content-start gap-2" aria-labelledby="journal">
          <SectionHead id="journal" title="Journal des séances" />
          <SessionJournal />
          <Link href="/capsules" className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-raised px-4 py-3 text-ink no-underline">
            <Icon name="capsule" className="text-brand-text" />
            <span className="grid flex-1">
              <span className="font-bold">Capsules des seniors</span>
              <span className="text-sm text-muted">Ce qu’ils ont appris, en moins de 5 minutes</span>
            </span>
            <Icon name="chevron" size={18} className="text-subtle" />
          </Link>
        </section>
      </Page>
    </>
  );
}
