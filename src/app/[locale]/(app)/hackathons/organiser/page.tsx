import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { OrganizeForm } from "@/components/features/hackathons/OrganizeForm";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.organize");
  return { title: t("heading") };
}

async function Data() {
  const user = await pageUser("/hackathons/organiser");
  return <OrganizeForm defaultOrganizer={user.name} />;
}

export default async function OrganizePage() {
  const t = await getTranslations("hackathons.organize");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <Data />
    </Suspense>
  );
}
