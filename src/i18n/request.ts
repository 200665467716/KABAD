import { locale as rootLocale } from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

/*
 * La langue vient du segment [locale] (racine de l'application), lu avec next/root-params :
 * les pages restent pré-rendues, sans lire les en-têtes de la requête.
 */
export default getRequestConfig(async ({ locale: override }) => {
  const segment = override ?? (await rootLocale());
  const locale = isLocale(segment) ? segment : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Africa/Lome",
  };
});
