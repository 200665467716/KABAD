import { createElement, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

/** Type de transition porté par chaque lien : le contenu de l'app s'anime au changement de page (voir la mise en page de l'app). */
export const PAGE_TRANSITION = "page";

/** Le lien de next-intl, avec la transition de page. Un lien peut la retirer avec `transitionTypes={[]}`. */
export function Link(props: ComponentProps<typeof navigation.Link>) {
  return createElement(navigation.Link, { transitionTypes: [PAGE_TRANSITION], ...props });
}

/**
 * Remplacent next/link et next/navigation : les liens et les redirections gardent la langue en cours,
 * et usePathname renvoie le chemin sans le préfixe /en.
 */
export const { usePathname, useRouter, getPathname } = navigation;
// Type écrit en toutes lettres : TypeScript sait alors que le code s'arrête après redirect().
export const redirect: typeof navigation.redirect = navigation.redirect;
