import { Badge, CardLink, type BadgeTone } from "@/components/ui/Display";
import { member, type Challenge } from "@/lib/data";
import { formatFCFA } from "@/lib/format";

export const kindLabel: Record<Challenge["kind"], { label: string; tone: BadgeTone }> = {
  cagnotte: { label: "Cagnotte", tone: "accent" },
  sponsorise: { label: "Sponsorisé", tone: "brand" },
  lot: { label: "Lot physique", tone: "neutral" },
};

export function ChallengeCard({ c }: { c: Challenge }) {
  const kind = c.status === "done" ? { label: "Terminé", tone: "success" as const } : kindLabel[c.kind];
  const href = c.status === "done" ? `/defis/${c.id}/resultats` : c.status === "jury" ? `/defis/${c.id}/jury` : `/defis/${c.id}`;
  const when = c.status === "open" ? `Clôture dans ${c.closesIn}` : c.status === "jury" ? "Résultats le 24 oct." : `Terminé le ${c.closes}`;
  const meta =
    c.status === "done" && c.ranking
      ? `Gagnant : ${member(c.ranking[0].memberId).name}, ${member(c.ranking[0].memberId).city}`
      : c.status === "jury"
        ? `3 seniors évaluent les ${c.participants} solutions`
        : [c.stack, c.level, c.requiresMentoring ? "6 h de mentorat requises" : c.sponsor ? `Sponsor : ${c.sponsor.toLowerCase()}` : "Ouvert à tous"].join(" · ");
  return (
    <CardLink href={href}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={kind.tone}>{kind.label}</Badge>
        <span className="text-sm text-muted tabular">{when}</span>
      </div>
      <h2 className="font-display text-lg font-bold">{c.title}</h2>
      <p className="text-sm text-muted">{meta}</p>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="font-display text-lg font-bold tracking-[-0.01em] tabular">{c.pot ? formatFCFA(c.pot) : c.prizeLabel}</span>
        <span className="text-sm text-muted tabular">
          {c.participants} {c.status === "open" ? "participants" : "solutions"}
        </span>
      </div>
    </CardLink>
  );
}
