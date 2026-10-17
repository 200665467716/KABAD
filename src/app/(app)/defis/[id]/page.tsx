import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { kindLabel } from "@/components/features/ChallengeCard";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { Avatar, AvatarGroup, Badge, Card, Overline, PrizeSplit } from "@/components/ui/Display";
import { challenge, challenges, member } from "@/lib/data";
import { formatFCFA, initials } from "@/lib/format";
import { EligibilityAlert, ParticipateButton } from "./Eligibility";

export function generateStaticParams() {
  return challenges.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/defis/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: challenge(id)?.title ?? "Défi" };
}

export default async function ChallengePage({ params }: PageProps<"/defis/[id]">) {
  const { id } = await params;
  const c = challenge(id);
  if (!c) notFound();
  const jury = c.juryIds.map(member);
  const kind = kindLabel[c.kind];

  return (
    <>
      <TopBar back="/defis" plain actions={<IconButton icon="share" label="Partager le défi" />} />
      <Page narrow className="flex-1 pt-0">
        <div className="grid gap-2">
          <div className="flex gap-1.5">
            <Badge tone={kind.tone}>{kind.label}</Badge>
            <Badge>{c.level}</Badge>
          </div>
          <h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-4xl">{c.title}</h1>
          <p className="text-sm text-muted tabular">
            {c.status === "open" ? `Clôture le ${c.closes}` : `Clôturé le ${c.closes}`} · {c.participants} participants
          </p>
        </div>

        <Card className="gap-3.5">
          {c.pot ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <Overline>{c.kind === "sponsorise" ? "Dotation du sponsor" : "Cagnotte actuelle"}</Overline>
                  <span className="font-display text-[30px] leading-9 font-bold tracking-[-0.03em] tabular">{formatFCFA(c.pot)}</span>
                </div>
                {c.kind === "cagnotte" && c.status === "open" && (
                  <ButtonLink href={`/soutenir/${c.id}`} size="sm" variant="secondary">
                    Contribuer
                  </ButtonLink>
                )}
              </div>
              <PrizeSplit total={c.pot} />
              <p className="text-xs text-muted">
                {c.contributors} contributeur{(c.contributors ?? 0) > 1 ? "s" : ""}
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

        {c.requiresMentoring && c.status === "open" && <EligibilityAlert />}

        <section className="grid gap-2">
          <Overline as="h2">Le défi</Overline>
          <p>{c.description}</p>
          <p className="text-sm text-muted">Défi individuel : chaque participant est évalué séparément.</p>
        </section>

        <section className="grid gap-2">
          <Overline as="h2">Jury</Overline>
          <div className="flex items-center gap-2">
            <AvatarGroup>
              {jury.map((j) => (
                <Avatar key={j.id} initials={initials(j.name)} size="sm" />
              ))}
            </AvatarGroup>
            <span className="text-sm text-muted">
              {jury.map((j, i) => (
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
      {c.status === "open" && (
        <ActionBar>
          <ParticipateButton challengeId={c.id} requiresMentoring={c.requiresMentoring} />
        </ActionBar>
      )}
    </>
  );
}
