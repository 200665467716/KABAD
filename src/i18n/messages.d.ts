import type shell from "../../messages/fr.json";
import type auth from "../../messages/fr/auth.json";
import type home from "../../messages/fr/home.json";
import type mentoring from "../../messages/fr/mentoring.json";
import type hackathons from "../../messages/fr/hackathons.json";
import type rise from "../../messages/fr/rise.json";
import type tests from "../../messages/fr/tests.json";
import type messaging from "../../messages/fr/messaging.json";
import type profile from "../../messages/fr/profile.json";
import type admin from "../../messages/fr/admin.json";
import type notifications from "../../messages/fr/notifications.json";
import type legal from "../../messages/fr/legal.json";
import type { routing } from "./routing";

/* Les clés de traduction sont vérifiées par TypeScript : le français est la référence. */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof shell & typeof auth & typeof home & typeof mentoring & typeof hackathons & typeof rise & typeof tests & typeof messaging & typeof profile & typeof admin & typeof notifications & typeof legal;
  }
}
