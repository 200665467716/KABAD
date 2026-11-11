import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { OrganizeForm } from "@/components/features/hackathons/OrganizeForm";
import { listMentors } from "@/server/mentoring";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.organize");
  return { title: t("heading") };
}

async function Data() {
  const user = await pageUser("/hackathons/organiser");
  // H8: badged mentors are suggested as instructors at the last step.
  return <OrganizeForm defaultOrganizer={user.name} mentors={await listMentors({ excludeId: user.id })} />;
}

export default async function OrganizePage() {
  const t = await getTranslations("hackathons.organize");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <Data />
    </Suspense>
  );
}
