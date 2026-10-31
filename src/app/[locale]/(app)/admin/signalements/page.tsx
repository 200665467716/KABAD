import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { listReports } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";
import { ReportQueue } from "./ReportQueue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.reports");
  return { title: t("metaTitle"), robots: { index: false } };
}

async function ReportsData({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const user = await adminUser("/admin/signalements");
  const { vue } = await searchParams;
  const status = vue === "traites" ? "REVIEWED" : "OPEN";
  return (
    <Page narrow>
      <AdminNav current="/admin/signalements" />
      <ReportQueue reports={await listReports(user.id, status)} status={status} />
    </Page>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<"/[locale]/admin/signalements">) {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar back="/admin" title={t("reports.title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <ReportsData searchParams={searchParams as Promise<{ vue?: string }>} />
      </Suspense>
    </>
  );
}
