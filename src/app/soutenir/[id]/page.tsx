import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar, AvatarGroup, Badge, Card } from "@/components/ui/Display";
import { Wordmark } from "@/components/ui/Logo";
import { challenge, challenges, member, recentContributions } from "@/lib/data";
import { formatFCFA, formatNumber, initials } from "@/lib/format";
import { ContributionForm } from "./ContributionForm";

export function generateStaticParams() {
  return challenges.filter((c) => c.kind === "cagnotte" && c.status === "open").map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/soutenir/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = challenge(id);
  return { title: c ? `Soutenir « ${c.title} »` : "Soutenir un défi", description: c?.description };
}

export default async function SponsorPage({ params }: PageProps<"/soutenir/[id]">) {
  const { id } = await params;
  const c = challenge(id);
  if (!c || c.kind !== "cagnotte" || c.status !== "open" || !c.pot) notFound();
  const jury = c.juryIds.map(member);

  const shares = [
    { dot: "bg-brand", title: "60 % · Le gagnant", text: "Versés sur son Mobile Money après les résultats du jury et 48 h de contestation." },
    { dot: "bg-accent", title: "30 % · Son mentor", text: "Le senior qui a accompagné le gagnant. Transmettre devient un vrai revenu." },
    { dot: "bg-subtle", title: "10 % · KABAD", text: "Pour faire fonctionner la plateforme, qui reste gratuite pour les développeurs." },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-raised pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 lg:px-10">
          <Link href="/" className="text-ink no-underline">
            <Wordmark />
          </Link>
          <ButtonLink href="/" variant="ghost" size="sm">
            Découvrir KABAD
          </ButtonLink>
        </div>
      </header>

      <main>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-8 px-4 py-8 lg:gap-16 lg:px-10 lg:py-18">
          <div className="grid min-w-0 flex-[999_1_480px] gap-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">Défi à cagnotte</Badge>
              <Badge>Ouvert jusqu’au {c.closes.split(" à ")[0]}</Badge>
            </div>
            <h1 className="font-display text-[36px] leading-10 font-bold tracking-[-0.035em] lg:text-[56px] lg:leading-[60px]">{c.title}</h1>
            <p className="max-w-[60ch] text-lg text-muted">
              {c.participants} jeunes développeurs d’Afrique construisent une API qui encaisse un paiement mobile money sans jamais débiter deux fois. Chacun travaille seul, accompagné par un mentor senior. Votre contribution récompense le meilleur et son mentor.
            </p>
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div className="grid">
                <dt className="order-2 text-sm text-muted">participants</dt>
                <dd className="m-0 font-display text-2xl font-bold tabular">{c.participants}</dd>
              </div>
              <div className="grid">
                <dt className="order-2 text-sm text-muted">seniors au jury</dt>
                <dd className="m-0 font-display text-2xl font-bold tabular">{jury.length}</dd>
              </div>
              <div className="grid">
                <dt className="order-2 text-sm text-muted">contributeurs</dt>
                <dd className="m-0 font-display text-2xl font-bold tabular">{c.contributors}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-3">
              <AvatarGroup>
                {jury.map((j) => (
                  <Avatar key={j.id} initials={initials(j.name)} size="sm" />
                ))}
              </AvatarGroup>
              <span className="text-sm text-muted">Jury : {jury.map((j) => j.name).join(", ")}</span>
            </div>
          </div>
          <aside className="w-full min-w-0 flex-[1_1_360px] lg:max-w-[440px]">
            <ContributionForm collected={c.pot} contributors={c.contributors ?? 0} companies={c.companies ?? 0} />
          </aside>
        </div>

        <section className="border-t border-line bg-raised" aria-labelledby="money">
          <div className="mx-auto grid max-w-[1200px] gap-7 px-4 py-10 lg:px-10 lg:py-18">
            <div className="grid max-w-[680px] gap-2">
              <p className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Où va votre argent</p>
              <h2 id="money" className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-4xl">
                Le gagnant et celui qui l’a formé.
              </h2>
            </div>
            <div className="flex h-4 gap-0.5 overflow-hidden rounded-xs" aria-hidden="true">
              <span className="bg-brand" style={{ flex: 60 }} />
              <span className="bg-accent" style={{ flex: 30 }} />
              <span className="bg-subtle" style={{ flex: 10 }} />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {shares.map((s) => (
                <div key={s.title} className="grid gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.06em] text-muted uppercase">
                    <span className={`size-2 rounded-xs ${s.dot}`} />
                    {s.title}
                  </span>
                  <p className="text-sm text-muted">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line" aria-labelledby="recent">
          <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-10 lg:px-10 lg:py-18">
            <h2 id="recent" className="font-display text-xl font-bold">
              Contributions récentes
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {recentContributions.map((r) => (
                <Card key={r.who} className="gap-1.5 px-4 py-3.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{r.who}</span>
                    <span className="font-bold tabular">{formatNumber(r.amount)}</span>
                  </div>
                  <span className="text-xs text-muted">{r.when}</span>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted">Montants en F CFA. Total collecté : {formatFCFA(c.pot)}.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-7">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-2 px-4 text-sm text-muted lg:px-10">
          <span>KABAD · par les devs, pour les devs</span>
          <span>kabad.app</span>
        </div>
      </footer>
    </div>
  );
}
