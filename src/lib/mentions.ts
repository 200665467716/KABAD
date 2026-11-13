/*
 * Mentions dans un groupe : « @Nadia » ou « @Nadia Bello » désigne un membre.
 * Une mention est un @ suivi du prénom ou du nom complet d'un membre, sans tenir compte des majuscules,
 * et suivi d'un caractère qui n'est ni une lettre ni un chiffre (« @Nadia, » oui, « @Nadiab » non).
 */

export type MentionMember = { id: string; name: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** The names a member can be mentioned by, longest first so that « @Nadia Bello » wins over « @Nadia ». */
function handles(members: MentionMember[]) {
  return members
    .flatMap((m) => [...new Set([m.name.trim(), firstName(m.name)])].filter(Boolean).map((handle) => ({ id: m.id, handle })))
    .sort((a, b) => b.handle.length - a.handle.length);
}

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_]/u.test(c);

export type MentionPart = { text: string; mention?: string };

/** Cuts a message into plain text and mentions, for display. `mention` holds the id of the member mentioned. */
export function splitMentions(text: string, members: MentionMember[]): MentionPart[] {
  if (!text.includes("@") || members.length === 0) return [{ text }];
  const list = handles(members);
  const out: MentionPart[] = [];
  let plain = "";
  let i = 0;
  while (i < text.length) {
    // A mention starts a word: « mail@exemple.tg » is not one.
    if (text[i] === "@" && !isWordChar(text[i - 1])) {
      const rest = text.slice(i + 1);
      const hit = list.find((h) => rest.slice(0, h.handle.length).toLocaleLowerCase("fr") === h.handle.toLocaleLowerCase("fr") && !isWordChar(rest[h.handle.length]));
      if (hit) {
        if (plain) out.push({ text: plain });
        plain = "";
        out.push({ text: `@${rest.slice(0, hit.handle.length)}`, mention: hit.id });
        i += 1 + hit.handle.length;
        continue;
      }
    }
    plain += text[i];
    i += 1;
  }
  if (plain) out.push({ text: plain });
  return out;
}

/** The members mentioned in a message, each once, in order of appearance. */
export function findMentions(text: string, members: MentionMember[]): string[] {
  return [...new Set(splitMentions(text, members).flatMap((p) => (p.mention ? [p.mention] : [])))];
}

/**
 * The word being typed after an @, when the cursor stands right after it: « Salut @Na| » gives « Na ».
 * Null when the cursor is not in a mention. The suggestions of the composer follow it.
 */
export function mentionQuery(text: string, cursor: number): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = /(^|[^\p{L}\p{N}_])@([\p{L}\p{N}_-]{0,30})$/u.exec(before);
  if (!match) return null;
  return { query: match[2], start: cursor - match[2].length - 1 };
}
