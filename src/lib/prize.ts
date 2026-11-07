/**
 * Money prizes (decision D6, simplified on 7 November 2026: hackathons and mentoring are independent).
 * Amounts are whole F CFA; rounding never creates or loses money: the remainder goes to KABAD.
 * 90 % to the winning team, 10 % to KABAD. Half of KABAD's share (5 % of the pot) is set aside
 * to top up future pots.
 */
export const WINNER_SHARE = 0.9;

export type PrizeSplit = { winner: number; platform: number; reserve: number };

export function splitPrize(total: number): PrizeSplit {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("Le montant doit être un nombre entier positif de F CFA.");
  }
  const winner = Math.floor(total * WINNER_SHARE);
  const platform = total - winner;
  return { winner, platform, reserve: Math.floor(platform / 2) };
}
