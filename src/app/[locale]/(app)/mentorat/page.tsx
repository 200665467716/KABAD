import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { MentoringProgress } from "@/components/features/MentoringProgress";
import { SessionJournal } from "@/components/features/SessionJournal";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Avatar, AvatarGroup, Card, Overline, SectionHead } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, initials } from "@/lib/format";
import { longDate } from "@/lib/time";
import type { Eligibility, MentorRequestView, PairView } from "@/lib/domain-types";
import { eligibility, listRequests, myPairs } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { EndPairButton, NextSessionPlanner, ReceivedRequests, SentRequestList } from "./MentoringActions";

export const metadata: Metadata = { title: "Mentorat" };

function CapsulesLink() {
  return (
    <Link href="/capsules" className="mt-2 flex items-center gap-3 rounded-lg border-2 border-line-strong bg-raised px-4 py-3 text-ink no-underline">
      <Icon name="capsule" className="text-brand-text" />
      <span className="grid flex-1">
        <span className="font-bold">Capsules des seniors</span>
        <span className="text-sm text-muted">Ce qu’ils ont appris, en moins de 5 minutes</span>
      </span>
      <Icon name="chevron" size={18} className="text-subtle" />
    </Link>
  );
}

function PairPanel({ pair, eligibility: e }: { pair: PairView; eligibility: Eligibility | null }) {
  const other = pair.iAm === "MENTOR" ? pair.mentee : pair.mentor;
  return (
    <>
      <Card className="content-start gap-3">
        <div className="flex items-center justify-between">
          <Overline>{pair.iAm === "MENTOR" ? `Projet de ${other.name}` : "Projet"}</Overline>
          {pair.repo && (
            <a href={`https://${pair.repo}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand-text no-underline" target="_blank" rel="noreferrer">
              <Icon name="code" size={16} />
              Dépôt
            </a>
          )}
        </div>
        <h2 className="font-display text-lg font-bold">{pair.project}</h2>
        {e && pair.iAm === "MENTEE" ? (
          <MentoringProgress eligibility={e} variant="pair" />
        ) : (
          <p className="text-sm text-muted">
            Temps confirmé par vous deux : <b className="text-ink tabular">{formatDuration(pair.confirmedMinutes)}</b>
          </p>
        )}
        <NextSessionPlanner pairId={pair.id} at={pair.nextSessionAt} />
        <ButtonLink href={pair.visioUrl} icon="video" block target="_blank" rel="noreferrer">
          Démarrer une séance en visio
        </ButtonLink>
        <p className="text-xs text-muted">Écran partagé sur Jitsi Meet. Pas de durée imposée : vous fixez le rythme à deux.</p>
      </Card>

      <section className="grid content-start gap-2" aria-labelledby={`journal-${pair.id}`}>
        <SectionHead
          id={`journal-${pair.id}`}
          title="Journal des séances"
          action={
            <Link href={`/mentorat/seances/nouvelle?binome=${pair.id}`} className="text-sm font-bold text-brand-text no-underline">
              Noter une séance
            </Link>
          }
        />
        <SessionJournal sessions={pair.sessions} />
        <EndPairButton pairId={pair.id} other={other.name} />
        <CapsulesLink />
      </section>
    </>
  );
}

function SentRequests({ sent }: { sent: MentorRequestView[] }) {
  if (sent.length === 0) return null;
  return <SentRequestList sent={sent} />;
}

async function MentoringData() {
  const user = await pageUser("/mentorat");
  const [pairs, requests, e] = await Promise.all([myPairs(user.id), listRequests(user.id), eligibility(user.id)]);
  const asMentee = pairs.filter((p) => p.iAm === "MENTEE");
  const asMentor = pairs.filter((p) => p.iAm === "MENTOR");
  const single = pairs.length === 1 ? pairs[0] : null;
  const other = single ? (single.iAm === "MENTOR" ? single.mentee : single.mentor) : null;

  return (
    <>
      <TopBar
        leading={
          single && other ? (
            <AvatarGroup className="mr-1">
              <Avatar initials={initials(single.mentor.name)} size="sm" />
              <Avatar initials={initials(single.mentee.name)} size="sm" tone="accent" />
            </AvatarGroup>
          ) : undefined
        }
        title={single && other ? `Binôme avec ${other.name.split(" ")[0]}` : "Mentorat"}
        subtitle={single ? `Depuis le ${longDate(single.since)}` : undefined}
        actions={<IconButton icon="search" label="Trouver un mentor" href="/mentorat/mentors" />}
      />
      <Page className="lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        {requests.received.length > 0 && (
          <section id="demandes" className="grid gap-2 lg:col-span-2" aria-labelledby="demandes-titre">
            <SectionHead id="demandes-titre" title="Demandes de mentorat reçues" />
            <ReceivedRequests requests={requests.received} />
          </section>
        )}
        {pairs.length === 0 && (
          <div className="grid content-start gap-3 lg:col-span-2">
            <SentRequests sent={requests.sent} />
            {user.role === "SENIOR" && !user.seniorVerifiedAt ? (
              <Card className="gap-2">
                <h2 className="font-display text-lg font-bold">Statut Senior en cours de vérification</h2>
                <p className="text-sm text-muted">L’équipe KABAD vérifie votre profil GitHub ou LinkedIn. Dès que c’est fait, vous apparaissez dans « Trouver un mentor » et vous recevez une notification.</p>
                <ButtonLink href="/inscription/profil" variant="secondary" className="justify-self-start">
                  Vérifier mon profil
                </ButtonLink>
              </Card>
            ) : user.role === "SENIOR" ? (
              <Card className="gap-2">
                <h2 className="font-display text-lg font-bold">Aucun binôme pour l’instant</h2>
                <p className="text-sm text-muted">
                  {user.mentorCapacity > 0 ? "Les juniors vous trouvent dans « Trouver un mentor ». Vous recevrez leurs demandes ici." : "Vous avez indiqué 0 place : les juniors ne peuvent pas vous écrire. Changez-le dans votre profil."}
                </p>
              </Card>
            ) : (
              <Card className="gap-3">
                <h2 className="font-display text-lg font-bold">Trouvez votre mentor</h2>
                <p className="text-sm text-muted">Un senior vous accompagne sur votre vrai projet, en visio. Les défis à cagnotte demandent 6 h de mentorat confirmées.</p>
                <MentoringProgress eligibility={e} />
                <ButtonLink href="/mentorat/mentors" icon="search">
                  Trouver un mentor
                </ButtonLink>
              </Card>
            )}
            <CapsulesLink />
          </div>
        )}
        {[...asMentee, ...asMentor].map((p) => (
          <PairPanel key={p.id} pair={p} eligibility={p.iAm === "MENTEE" ? e : null} />
        ))}
        {pairs.length > 0 && requests.sent.length > 0 && (
          <div className="lg:col-span-2">
            <SentRequests sent={requests.sent} />
          </div>
        )}
      </Page>
    </>
  );
}

export default function MentoringPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement du mentorat…</p>}>
      <MentoringData />
    </Suspense>
  );
}
