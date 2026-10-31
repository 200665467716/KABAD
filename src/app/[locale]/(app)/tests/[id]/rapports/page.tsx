import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { listReports } from "@/server/community-tests";
import { DomainError } from "@/server/errors";
import { pageUser } from "@/server/page";
import { ReportReview } from "./ReportReview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tests.review");
  return { title: t("metaTitle") };
}

async function ReportsData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/tests/${id}/rapports`);
  const data = await listReports(user.id, id).catch((e) => {
    if (e instanceof DomainError && (e.status === 403 || e.status === 404)) return null;
    throw e;
  });
  if (!data) notFound();
  return <ReportReview app={data.app} reports={data.reports} />;
}

export default async function ReportsPage({ params }: PageProps<"/[locale]/tests/[id]/rapports">) {
  const t = await getTranslations("tests.review");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <ReportsData params={params} />
    </Suspense>
  );
}
