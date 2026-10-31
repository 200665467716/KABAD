import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** The former challenges tab: hackathons replaced challenges. */
export default async function OldChallengesPage() {
  redirect({ href: "/admin/hackathons", locale: await getLocale() });
}
