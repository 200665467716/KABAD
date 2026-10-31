import { locale as rootLocale } from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

/** One dictionary per module (messages/fr/mentoring.json…), merged with the shell's (messages/fr.json). */
export const MODULES = ["auth", "home", "mentoring", "hackathons", "rise", "tests", "messaging", "profile", "admin", "notifications", "capsules", "legal"] as const;

async function load(locale: string) {
  const parts = await Promise.all([import(`../../messages/${locale}.json`), ...MODULES.map((m) => import(`../../messages/${locale}/${m}.json`))]);
  return Object.assign({}, ...parts.map((p) => p.default));
}

/*
 * La langue vient du segment [locale] (racine de l'application), lu avec next/root-params :
 * les pages restent pré-rendues, sans lire les en-têtes de la requête.
 */
export default getRequestConfig(async ({ locale: override }) => {
  const segment = override ?? (await rootLocale());
  const locale = isLocale(segment) ? segment : routing.defaultLocale;
  return { locale, messages: await load(locale), timeZone: "Africa/Lome" };
});
