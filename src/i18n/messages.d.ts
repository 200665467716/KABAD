import type messages from "../../messages/fr.json";
import type { routing } from "./routing";

/* Les clés de traduction sont vérifiées par TypeScript : fr.json est la référence. */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
