import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Overline, PrizeSplit } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { CURRENT_USER_ID, challenge, challenges, member, pair } from "@/lib/data";
import { formatFCFA, initials } from "@/lib/format";
import { splitPrize } from "@/lib/prize";

export const metadata: Metadata = { title: "Résultats" };

export function generateStaticParams() {
  return challenges.filter((c) => c.status === "done").map((c) => ({ id: c.id }));
}

export default async function ResultsPage({ params }: PageProps<"/defis/[id]/resultats">) {
  const { id } = await params;
  const c = challenge(id);
  if (!c || c.status !== "done" || !c.ranking || !c.pot || !c.payout) notFound();
  const split = splitPrize(c.pot);
  const iWon = c.ranking[0].memberId === CURRENT_USER_ID;
  const mentor = member(pair.mentorId);
  const steps = [
    { label: "Résultats publiés", when: c.payout.publishedOn },
    { label: "Délai de contestation de 48 h écoulé", when: c.payout.contestEndsOn },
    { label: `Envoyé sur ${c.payout.operator} ${c.payout.phone}`, when: `${c.payout.paidOn} · réf. ${c.payout.reference}`, mono: true },
  ];

  return (
    <>
      <TopBar back="/defis" title={c.title} subtitle={`Terminé le ${c.closes} · ${c.participants} solutions`} />
      <Page narrow>
        {iWon && (
          <section className="grid gap-1.5 rounded-lg bg-accent p-4 text-on-accent">
            <p className="text-xs font-bold tracking-[0.08em] uppercase">Vous avez gagné</p>
            <p className="font-celebrate text-[34px] font-extrabold tracking-[-0.03em] leading-10 tabular">{formatFCFA(split.winner)}</p>
            <p className="text-sm">Note moyenne du jury : {c.ranking[0].mark.toLocaleString("fr-FR")} sur 20. Bravo Kossi.</p>
          </section>
        )}

        <section className="grid gap-2" aria-labelledby="rank">
          <Overline as="h2" id="rank">
            Classement
          </Overline>
          <ol className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
            {c.ranking.map((r, i) => {
              const m = member(r.memberId);
              const me = r.memberId === CURRENT_USER_ID;
              return (
                <li key={r.memberId} className="grid grid-cols-[28px_auto_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-2.5">
                  <span className="text-center font-display text-lg font-bold tabular">{i + 1}</span>
                  <Avatar initials={initials(m.name)} size="sm" tone={me ? "accent" : "brand"} />
                  <span className={cn("truncate text-sm", me && "font-bold")}>
                    {m.name}
                    {me ? " (vous)" : ""}
                  </span>
                  <span className={cn("text-sm tabular", i === 0 && "font-bold")}>{r.mark.toLocaleString("fr-FR")}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid gap-2" aria-labelledby="payout">
          <Overline as="h2" id="payout">
            Versement de la cagnotte ({formatFCFA(c.pot)})
          </Overline>
          <Card className="gap-4">
            <PrizeSplit total={c.pot} labels={[iWon ? "Vous" : "Gagnant", mentor.name, "KABAD"]} />
            <ol className="m-0 grid list-none p-0">
              {steps.map((s, i) => (
                <li key={s.label} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-3.5 last:pb-0">
                  {i < steps.length - 1 && <span className="absolute top-5 bottom-0 left-[9px] w-0.5 bg-line" aria-hidden="true" />}
                  <span className="grid size-5 place-items-center rounded-full bg-success text-on-success">
                    <Icon name="check" size={16} strokeWidth={3} className="size-3" />
                  </span>
                  <span className="grid gap-0.5">
                    <span className="text-sm font-bold">{s.label}</span>
                    <span className={cn("text-xs text-muted", s.mono && "font-mono")}>{s.when}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </Page>
    </>
  );
}
