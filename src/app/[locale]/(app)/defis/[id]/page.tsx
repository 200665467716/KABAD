import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { kindLabel } from "@/components/features/ChallengeCard";
import { ShareButton } from "@/components/features/ShareButton";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, Avatar, AvatarGroup, Badge, Card, Overline, PrizeSplit } from "@/components/ui/Display";
import { formatFCFA, initials } from "@/lib/format";
import { dateAndHour, longDate } from "@/lib/time";
import { getChallenge } from "@/server/challenges";
import { eligibility } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { EligibilityAlert, ParticipateButton } from "./Eligibility";

export const metadata: Metadata = { title: "Défi" };

async function ChallengeData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/defis/${id}`);
  const c = await orNotFound(getChallenge(user.id, id));
  if (!c) notFound();
  const e = await eligibility(user.id);
  const kind = kindLabel[c.kind];
  const open = c.status === "OPEN";

  return (
    <>
      <TopBar back="/defis" plain actions={c.kind === "CAGNOTTE" && open ? <ShareButton path={`/soutenir/${c.id}`} label="Partager la cagnotte" title={c.title} /> : undefined} />
      <Page narrow className="flex-1 pt-0">
        <div className="grid gap-2">
          <div className="flex gap-1.5">
            <Badge tone={kind.tone}>{kind.label}</Badge>
            <Badge>{c.level}</Badge>
            {c.status === "JURY" && <Badge tone="brand">En jury</Badge>}
            {c.status === "DONE" && <Badge tone="success">Terminé</Badge>}
          </div>
          <h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-4xl">{c.title}</h1>
          <p className="text-sm text-muted tabular">
            {open ? `Clôture le ${dateAndHour(c.closesAt)}` : `Clôturé le ${longDate(c.closesAt)}`} · {c.participants} participant{c.participants > 1 ? "s" : ""}
          </p>
        </div>

        <Card className="gap-3.5">
          {c.kind !== "LOT" ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <Overline>{c.kind === "SPONSORISE" ? "Dotation du sponsor" : open ? "Cagnotte actuelle" : "Cagnotte"}</Overline>
                  <span className="font-display text-[30px] leading-9 font-bold tracking-[-0.03em] tabular">{formatFCFA(c.pot)}</span>
                </div>
                {c.kind === "CAGNOTTE" && open && (
                  <ButtonLink href={`/soutenir/${c.id}`} size="sm" variant="secondary">
                    Contribuer
                  </ButtonLink>
                )}
              </div>
              <PrizeSplit total={c.pot} />
              <p className="text-xs text-muted">
                {c.contributors} contributeur{c.contributors > 1 ? "s" : ""}
                {c.companies ? `, dont ${c.companies} entreprise${c.companies > 1 ? "s" : ""}` : ""}. Montants en F CFA.
              </p>
            </>
          ) : (
            <div className="grid gap-1">
              <Overline>Lot</Overline>
              <span className="font-display text-2xl font-bold">{c.prizeLabel}</span>
              <p className="text-sm text-muted">Un lot physique revient entièrement au gagnant.</p>
            </div>
          )}
        </Card>

        {c.requiresMentoring && open && !c.amJuror && <EligibilityAlert eligibility={e} />}
        {c.mySubmission && open && (
          <Alert tone="success" title="Votre solution est soumise.">
            Vous pouvez la modifier jusqu’au {dateAndHour(c.closesAt)}.
          </Alert>
        )}
        {c.status === "JURY" && (
          <Alert tone="info" title="Le jury évalue les solutions.">
            {c.resultsAt ? `Résultats attendus le ${longDate(c.resultsAt)}.` : "Les résultats seront publiés après l’évaluation."}
          </Alert>
        )}

        <section className="grid gap-2">
          <Overline as="h2">Le défi</Overline>
          <p>{c.description}</p>
          <p className="text-sm text-muted">Défi individuel : chaque participant est évalué séparément.</p>
        </section>

        <section className="grid gap-2">
          <Overline as="h2">Jury</Overline>
          <div className="flex items-center gap-2">
            <AvatarGroup>
              {c.jury.map((j) => (
                <Avatar key={j.id} initials={initials(j.name)} size="sm" />
              ))}
            </AvatarGroup>
            <span className="text-sm text-muted">
              {c.jury.map((j, i) => (
                <span key={j.id}>
                  {i > 0 && ", "}
                  <Link href={`/profil/${j.id}`} className="text-muted">
                    {j.name}
                  </Link>
                </span>
              ))}
            </span>
          </div>
        </section>
      </Page>
      {open && !c.amJuror && (
        <ActionBar>
          <ParticipateButton challengeId={c.id} requiresMentoring={c.requiresMentoring} eligibility={e} submitted={c.mySubmission !== null} />
        </ActionBar>
      )}
      {c.amJuror && c.status === "JURY" && (
        <ActionBar>
          <ButtonLink href={`/defis/${c.id}/jury`} size="lg" block>
            Évaluer les solutions
          </ButtonLink>
        </ActionBar>
      )}
      {c.status === "DONE" && (
        <ActionBar>
          <ButtonLink href={`/defis/${c.id}/resultats`} size="lg" block>
            Voir les résultats
          </ButtonLink>
        </ActionBar>
      )}
    </>
  );
}

export default function ChallengePage({ params }: PageProps<"/[locale]/defis/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement du défi…</p>}>
      <ChallengeData params={params} />
    </Suspense>
  );
}
