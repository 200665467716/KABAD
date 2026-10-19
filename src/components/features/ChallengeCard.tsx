import { Badge, CardLink, type BadgeTone } from "@/components/ui/Display";
import { formatDuration, formatFCFA } from "@/lib/format";
import { REQUIRED_MENTORING_MINUTES } from "@/lib/mentoring";
import { longDate, timeLeft } from "@/lib/time";
import type { ChallengeSummary } from "@/lib/domain-types";

export const kindLabel: Record<ChallengeSummary["kind"], { label: string; tone: BadgeTone }> = {
  CAGNOTTE: { label: "Cagnotte", tone: "accent" },
  SPONSORISE: { label: "Sponsorisé", tone: "brand" },
  LOT: { label: "Lot physique", tone: "neutral" },
};

export const prizeOf = (c: Pick<ChallengeSummary, "kind" | "pot" | "prizeLabel">) => (c.kind === "LOT" ? (c.prizeLabel ?? "Lot") : formatFCFA(c.pot));

export function challengeHref(c: Pick<ChallengeSummary, "id" | "status">) {
  return c.status === "DONE" ? `/defis/${c.id}/resultats` : `/defis/${c.id}`;
}

export function ChallengeCard({ c }: { c: ChallengeSummary }) {
  const kind = c.status === "DONE" ? { label: "Terminé", tone: "success" as const } : kindLabel[c.kind];
  const when =
    c.status === "OPEN" ? `Clôture dans ${timeLeft(c.closesAt)}` : c.status === "JURY" ? (c.resultsAt ? `Résultats le ${longDate(c.resultsAt)}` : "Jury en cours") : `Terminé le ${longDate(c.closesAt)}`;
  const meta =
    c.status === "DONE" && c.winner
      ? `Gagnant : ${c.winner.name}${c.winner.city ? `, ${c.winner.city}` : ""}`
      : c.status === "JURY"
        ? `3 seniors évaluent les ${c.participants} solutions`
        : [c.stack, c.level, c.requiresMentoring ? `${formatDuration(REQUIRED_MENTORING_MINUTES)} de mentorat requises` : c.sponsorName ? `Sponsor : ${c.sponsorName.toLowerCase()}` : "Ouvert à tous"].join(" · ");
  return (
    <CardLink href={challengeHref(c)}>
      <div className="flex items-center justify-between gap-2">
        <Badge tone={kind.tone}>{kind.label}</Badge>
        <span className="text-sm text-muted tabular">{when}</span>
      </div>
      <h2 className="font-display text-lg font-bold">{c.title}</h2>
      <p className="text-sm text-muted">{meta}</p>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="font-display text-lg font-bold tracking-[-0.01em] tabular">{prizeOf(c)}</span>
        <span className="text-sm text-muted tabular">
          {c.participants} {c.status === "OPEN" ? `participant${c.participants > 1 ? "s" : ""}` : `solution${c.participants > 1 ? "s" : ""}`}
        </span>
      </div>
    </CardLink>
  );
}
