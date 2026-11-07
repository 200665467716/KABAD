import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { getTestApp } from "@/server/community-tests";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ReportForm } from "./ReportForm";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tests.report");
  return { title: t("metaTitle") };
}

async function ReportData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/tests/${id}/rapport`);
  const t = await orNotFound(getTestApp(user.id, id));
  if (!t) notFound();
  // The owner reads reports; only a tester who joined the group reports, once (again after a refusal).
  if (t.owner.id === user.id || !t.joined || t.myReport === "SUBMITTED" || t.myReport === "VALIDATED") redirect({ href: `/tests/${id}`, locale: await getLocale() });
  return <ReportForm app={t} />;
}

export default async function ReportPage({ params }: PageProps<"/[locale]/tests/[id]/rapport">) {
  const t = await getTranslations("tests.report");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <ReportData params={params} />
    </Suspense>
  );
}
