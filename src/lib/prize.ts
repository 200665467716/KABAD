/**
 * Prix d'un hackathon (décision D12) : l'organisateur annonce de 0 à 5 prix en texte libre.
 * Ils sont attribués dans l'ordre du classement : le premier prix à la première équipe, etc.
 * KABAD ne garde ni ne verse d'argent.
 */
export const MAX_PRIZES = 5;

/** The prize of the team ranked `place` (1 = first), or null when there is none for that place. */
export function prizeFor(prizes: readonly string[], place: number): string | null {
  if (!Number.isInteger(place) || place < 1 || place > MAX_PRIZES) return null;
  return prizes[place - 1] ?? null;
}
