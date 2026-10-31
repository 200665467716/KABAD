import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

/**
 * Remplacent next/link et next/navigation : les liens et les redirections gardent la langue en cours,
 * et usePathname renvoie le chemin sans le préfixe /en.
 */
export const { Link, usePathname, useRouter, getPathname } = navigation;
// Type écrit en toutes lettres : TypeScript sait alors que le code s'arrête après redirect().
export const redirect: typeof navigation.redirect = navigation.redirect;
