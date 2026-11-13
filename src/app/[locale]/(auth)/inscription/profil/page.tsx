import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { ProfileStep } from "./ProfileStep";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("profile") };
}

async function ProfileStepData() {
  const u = await pageUser("/inscription/profil");
  // La base donne un niveau à tout compte (DEBUTANT) : il ne compte qu’une fois cette étape envoyée, avec le pays.
  return <ProfileStep initial={{ country: u.country, city: u.city, level: u.country ? u.level : null }} />;
}

/** Screen A4, step 3 of 5: country, city and level. */
export default async function ProfileStepPage() {
  const t = await getTranslations("auth");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <ProfileStepData />
    </Suspense>
  );
}
