/**
 * Money prizes are split 60 % to the winner, 30 % to the winner's mentor and 10 % to KABAD.
 * Amounts are whole F CFA. Rounding never creates or loses money: the remainder goes to KABAD.
 */
export const PRIZE_SHARES = { winner: 0.6, mentor: 0.3, platform: 0.1 } as const;

export type PrizeSplit = { winner: number; mentor: number; platform: number };

export function splitPrize(total: number): PrizeSplit {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("Le montant doit être un nombre entier positif de F CFA.");
  }
  const winner = Math.floor(total * PRIZE_SHARES.winner);
  const mentor = Math.floor(total * PRIZE_SHARES.mentor);
  return { winner, mentor, platform: total - winner - mentor };
}
