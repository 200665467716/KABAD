/**
 * Money prizes (decision D6). Amounts are whole F CFA; rounding never creates or loses money:
 * the remainder goes to KABAD.
 * - Level 2, no mentor required: 90 % to the winner, 10 % to KABAD.
 * - Level 3, mentoring required: 60 % to the winner, 30 % to the winner's mentor, 10 % to KABAD.
 * Half of KABAD's share (5 % of the pot) is set aside to top up future pots.
 */
export const PRIZE_SHARES = {
  withMentor: { winner: 0.6, mentor: 0.3 },
  withoutMentor: { winner: 0.9, mentor: 0 },
} as const;

export type PrizeSplit = { winner: number; mentor: number; platform: number; reserve: number };

export function splitPrize(total: number, withMentor = true): PrizeSplit {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("Le montant doit être un nombre entier positif de F CFA.");
  }
  const shares = withMentor ? PRIZE_SHARES.withMentor : PRIZE_SHARES.withoutMentor;
  const winner = Math.floor(total * shares.winner);
  const mentor = Math.floor(total * shares.mentor);
  const platform = total - winner - mentor;
  return { winner, mentor, platform, reserve: Math.floor(platform / 2) };
}
