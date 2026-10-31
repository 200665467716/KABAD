import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** The catalogue now lives on /mentorat: old links land there. */
export default async function MentorsPage() {
  redirect({ href: "/mentorat", locale: await getLocale() });
}
