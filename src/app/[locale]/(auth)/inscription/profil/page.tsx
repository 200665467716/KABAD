import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { ProfileStep } from "./ProfileStep";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("profile") };
}

async function ProfileStepData() {
  const u = await pageUser("/inscription/profil");
  return <ProfileStep initial={{ country: u.country, city: u.city, level: u.level }} />;
}

/** Screen A4, step 3 of 5: country, city and level. */
export default async function ProfileStepPage() {
  const t = await getTranslations("auth");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <ProfileStepData />
    </Suspense>
  );
}
