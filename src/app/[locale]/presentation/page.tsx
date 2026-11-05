import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Presentation } from "@/components/features/landing/Presentation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: t("video.metaTitle"), description: t("video.lead") };
}

/**
 * The presentation on the whole screen: a link to share, and what scripts/record-presentation.mjs films.
 * Here the visitor asked for it, so it starts at once.
 */
export default async function PresentationPage() {
  const t = await getTranslations("landing.video");
  return (
    <main>
      <h1 className="sr-only">{t("title")}</h1>
      <Presentation fill />
    </main>
  );
}
