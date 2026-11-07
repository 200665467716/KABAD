import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { getAvailability } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { AvailabilityForm } from "./AvailabilityForm";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mentoring.availability");
  return { title: t("title") };
}

async function AvailabilityData() {
  const user = await pageUser("/mentorat/disponibilites");
  const t = await getTranslations("mentoring.availability");
  if (!user.seniorVerifiedAt) {
    return (
      <Page narrow>
        <p className="rounded-action bg-bg px-4 py-6 text-center text-muted">{t("notMentor")}</p>
        <ButtonLink href="/mentorat/badge" block>
          {t("askBadge")}
        </ButtonLink>
      </Page>
    );
  }
  return <AvailabilityForm initial={await getAvailability(user.id)} />;
}

export default async function AvailabilityPage() {
  const t = await getTranslations("mentoring");
  return (
    <>
      <TopBar back="/mentorat" title={t("availability.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <AvailabilityData />
      </Suspense>
    </>
  );
}
