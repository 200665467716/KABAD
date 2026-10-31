import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { recommendations } from "@/server/members";
import { pageUser } from "@/server/page";
import { Recommendations } from "./Recommendations";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth.meta"))("suggestions") };
}

async function RecommendationsData() {
  const user = await pageUser("/inscription/recommandations");
  return <Recommendations people={await recommendations(user.id)} />;
}

/** Screen A6, step 5 of 5, and its empty state A6b. */
export default async function RecommendationsPage() {
  const t = await getTranslations("auth");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <RecommendationsData />
    </Suspense>
  );
}
