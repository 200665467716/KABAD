import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { InterestsStep } from "./InterestsStep";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("interests") };
}

async function InterestsData() {
  const u = await pageUser("/inscription/interets");
  return <InterestsStep initial={{ stack: u.stack, goals: u.goals }} />;
}

/** Screen A5, step 4 of 5: technologies and what the member came for. */
export default async function InterestsPage() {
  const t = await getTranslations("auth");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <InterestsData />
    </Suspense>
  );
}
