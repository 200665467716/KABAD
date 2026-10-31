import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "./auth";

/** The signed-in member for a page, or a redirect to sign-in that comes back to `path`. */
export async function pageUser(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect({ href: `/connexion?suite=${encodeURIComponent(path)}`, locale: await getLocale() });
  return user;
}
