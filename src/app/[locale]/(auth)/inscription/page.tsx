import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth";
import { SignUpForm } from "./SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("signUp") };
}

/*
 * Un membre connecté n'a pas à créer un second compte : il va sur son accueil.
 * Vérifié ici avec la vraie session, pas dans src/proxy.ts : un cookie expiré ne doit pas
 * empêcher de s'inscrire (le proxy ne voit que la présence du cookie).
 */
async function SignUp() {
  if (await getCurrentUser()) redirect({ href: "/accueil", locale: await getLocale() });
  return <SignUpForm />;
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <SignUp />
    </Suspense>
  );
}
