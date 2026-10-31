/*
 * Error messages are written in French in the code. When the page is in English, the API answers
 * in English: exact messages from a table, messages built with values from patterns
 * (src/server/error-messages.en.json). An unknown message stays in French rather than disappearing.
 */
import table from "./error-messages.en.json";

const exact = new Map(Object.entries(table.exact as Record<string, string>));
const patterns = (table.patterns as Array<{ fr: string; en: string }>).map((p) => ({ re: new RegExp(p.fr), en: p.en }));

export type ApiLocale = "fr" | "en";

/** The language of the page that called the API: sent by src/lib/api.ts, otherwise read from the referring page. */
export function requestLocale(request: Request): ApiLocale {
  const sent = request.headers.get("x-kabad-locale");
  if (sent === "en" || sent === "fr") return sent;
  try {
    return /^\/en(\/|$)/.test(new URL(request.headers.get("referer") ?? "").pathname) ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export function translateError(message: string, locale: ApiLocale): string {
  if (locale === "fr") return message;
  const found = exact.get(message);
  if (found) return found;
  for (const p of patterns) {
    const m = message.match(p.re);
    // A captured part can itself be a known message ("Trop d’essais. Réessaie dans 5 min.").
    if (m) return p.en.replace(/\$(\d)/g, (_, i: string) => exact.get(m[Number(i)]) ?? m[Number(i)] ?? "");
  }
  return message;
}
