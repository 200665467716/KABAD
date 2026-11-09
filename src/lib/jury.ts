/** Each of the 3 seniors scores every solution separately on 4 criteria from 1 to 5 (20 points). */
export const JURY_CRITERIA = [
  { id: "works", label: "Ça fonctionne", hint: "le cas demandé" },
  { id: "code", label: "Qualité du code", hint: "lisible, découpé" },
  { id: "tests", label: "Tests", hint: "cas d’échec compris" },
  { id: "explain", label: "Explication", hint: "choix justifiés" },
] as const;

export type CriterionId = (typeof JURY_CRITERIA)[number]["id"];
export type JuryScore = Record<CriterionId, number>;

export function totalScore(score: JuryScore): number {
  return JURY_CRITERIA.reduce((sum, c) => {
    const v = score[c.id];
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new RangeError(`Note invalide pour « ${c.label} ».`);
    return sum + v;
  }, 0);
}

/** The organizer's prizes go down the ranking: the 1st prize to the 1st team, and so on. Teams past the last prize win nothing. */
export function awardPrizes<T>(ranking: T[], prizes: string[]): Array<{ team: T; rank: number; prize: string }> {
  return ranking.slice(0, prizes.length).map((team, i) => ({ team, rank: i + 1, prize: prizes[i] }));
}

/** Final mark = average of the jurors' totals, rounded to one decimal. */
export function averageMark(totals: number[]): number {
  if (totals.length === 0) return 0;
  return Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10;
}
