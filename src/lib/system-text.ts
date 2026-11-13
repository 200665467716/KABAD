/**
 * Les textes que l'application écrit elle-même en base (lignes système des conversations, message retiré,
 * nom d'un groupe de testeurs, titre par défaut d'un salon) sont enregistrés en français.
 * On les traduit à l'affichage, par une table « motif français → phrase anglaise » : rien ne change en base,
 * et les lignes déjà écrites sont traduites comme les nouvelles. Un texte inconnu s'affiche tel quel.
 */

/** Textes fixes écrits par le serveur (src/server/messaging.ts, src/server/rise.ts). */
const FIXED_EN: Record<string, string> = {
  "Message retiré par la modération.": "Message removed by moderation.",
  "Message d’un membre que tu as bloqué.": "Message from a member you blocked.",
  "Salon de discussion": "Discussion room",
};

/** « Yao, Edem et Awa » → « Yao, Edem and Awa » : seul le dernier « et » sépare deux prénoms. */
const namesEn = (names: string) => names.replace(/ et (?=[^,]*$)/, " and ");

/** Lignes système, dans l'ordre : la première qui correspond gagne. `(\S+)` est un prénom. */
const SYSTEM_EN: Array<[RegExp, (...m: string[]) => string]> = [
  [/^(\S+) a accepté l’invitation$/, (a) => `${a} accepted the invitation`],
  [/^(\S+) a créé le groupe et ajouté (.+)$/, (a, b) => `${a} created the group and added ${namesEn(b)}`],
  [/^(\S+) a ajouté (.+)$/, (a, b) => `${a} added ${namesEn(b)}`],
  [/^(\S+) a retiré la photo du groupe$/, (a) => `${a} removed the group photo`],
  [/^(\S+) a changé la photo du groupe$/, (a) => `${a} changed the group photo`],
  [/^(\S+) a retiré (\S+)$/, (a, b) => `${a} removed ${b}`],
  [/^(\S+) a renommé le groupe « (.+) »$/, (a, b) => `${a} renamed the group “${b}”`],
  [/^(\S+) a changé le thème du groupe$/, (a) => `${a} changed the group theme`],
  [/^(\S+) a quitté le groupe\. (\S+) gère maintenant le groupe$/, (a, b) => `${a} left the group. ${b} now manages the group`],
  [/^(\S+) a quitté le groupe$/, (a) => `${a} left the group`],
  [/^(\S+) a rejoint le groupe$/, (a) => `${a} joined the group`],
  [/^(\S+) a ouvert le groupe de test\. Installer l’app : (.+)$/, (a, b) => `${a} opened the test group. Install the app: ${b}`],
  [/^(\S+) a créé l’équipe (.+)\. Cette discussion est réservée à ses membres\.$/, (a, b) => `${a} created the team ${b}. This chat is for its members only.`],
  [/^(\S+) a lancé le projet « (.+) »$/, (a, b) => `${a} launched the project “${b}”`],
];

const english = (locale: string) => !locale.startsWith("fr");

/**
 * Le texte d'un message dans la langue du lecteur. Les textes fixes (message retiré, message masqué)
 * sont traduits partout ; les motifs des lignes système seulement si `system` est vrai,
 * pour ne jamais réécrire ce qu'un membre a tapé.
 */
export function localizeSystemText(text: string, locale: string, system = true): string {
  if (!english(locale)) return text;
  const fixed = FIXED_EN[text];
  if (fixed) return fixed;
  if (!system) return text;
  for (const [pattern, write] of SYSTEM_EN) {
    const m = pattern.exec(text);
    if (m) return write(...m.slice(1));
  }
  return text;
}

/** Le nom d'un groupe, traduit s'il a été écrit par l'application : « Testeurs Kora » → « Testers Kora ». */
export function localizeGroupName(name: string, locale: string): string {
  if (!english(locale)) return name;
  return name.replace(/^Testeurs (?=\S)/, "Testers ");
}

/** Le titre d'un salon : le titre par défaut est traduit, celui choisi par un membre reste tel quel. */
export function localizeRoomTitle(title: string, locale: string): string {
  return english(locale) ? (FIXED_EN[title] ?? title) : title;
}
