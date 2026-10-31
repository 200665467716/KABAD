import { defineRouting } from "next-intl/routing";

/*
 * Langues de l'interface. Le français est la langue par défaut et garde des adresses sans préfixe
 * (/accueil) ; l'anglais vit sous /en (/en/accueil). La langue n'est jamais devinée depuis le navigateur :
 * le jury et la majorité des membres sont francophones, l'anglais se choisit dans l'interface.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}
