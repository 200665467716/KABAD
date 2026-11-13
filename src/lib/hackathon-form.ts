/*
 * Les vérifications du formulaire « Organiser », étape par étape. Ce sont les règles du serveur
 * (hackathonSchema et checkDates) : l'écran les donne toutes à la fois, avant de passer à l'étape suivante.
 */

/** Les niveaux, enregistrés par leur libellé français ; l'écran les affiche par leur rang dans cette liste. */
export const HACKATHON_LEVELS = ["Tous niveaux", "Débutant", "Intermédiaire", "Avancé"] as const;

/** Le rang d'un niveau enregistré (0 à 3), ou null pour un texte inconnu. */
export function levelIndex(level: string): 0 | 1 | 2 | 3 | null {
  const i = HACKATHON_LEVELS.indexOf(level as (typeof HACKATHON_LEVELS)[number]);
  return i < 0 ? null : (i as 0 | 1 | 2 | 3);
}

export type OrganizeError =
  | "title"
  | "organizer"
  | "city"
  | "start"
  | "end"
  | "endBeforeStart"
  | "closes"
  | "closesAfterStart"
  | "closesPast"
  | "stack"
  | "description"
  | "rulesUrl";

type Step1 = { title: string; organizerName: string; format: string; city: string; startsAt: string; endsAt: string; closesAt: string; stack: string };
type Step2 = { description: string; rulesUrl: string };

/** Les erreurs de l'étape 1, par champ, dans l'ordre de l'écran. Les dates sont celles des champs datetime-local. */
export function checkStep1(f: Step1, now = Date.now()): Record<string, OrganizeError> {
  const out: Record<string, OrganizeError> = {};
  if (f.title.trim().length < 5) out.title = "title";
  if (f.organizerName.trim().length < 2) out.organizerName = "organizer";
  if (f.format !== "ONLINE" && !f.city.trim()) out.city = "city";
  const start = f.startsAt ? new Date(f.startsAt).getTime() : NaN;
  const end = f.endsAt ? new Date(f.endsAt).getTime() : NaN;
  const close = f.closesAt ? new Date(f.closesAt).getTime() : NaN;
  if (Number.isNaN(start)) out.startsAt = "start";
  if (Number.isNaN(end)) out.endsAt = "end";
  else if (!Number.isNaN(start) && end <= start) out.endsAt = "endBeforeStart";
  if (Number.isNaN(close)) out.closesAt = "closes";
  else if (!Number.isNaN(start) && close > start) out.closesAt = "closesAfterStart";
  else if (close <= now) out.closesAt = "closesPast";
  if (f.stack.trim().length < 2) out.stack = "stack";
  return out;
}

/** Les erreurs de l'étape 2 : le défi (30 caractères au moins) et le lien du règlement (https). */
export function checkStep2(f: Step2): Record<string, OrganizeError> {
  const out: Record<string, OrganizeError> = {};
  if (f.description.trim().length < 30) out.description = "description";
  if (f.rulesUrl && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(f.rulesUrl)) out.rulesUrl = "rulesUrl";
  return out;
}
