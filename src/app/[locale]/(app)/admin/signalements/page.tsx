import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { listReports } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";
import { ReportQueue } from "./ReportQueue";

export const metadata: Metadata = { title: "Signalements", robots: { index: false } };

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

export default function ReportsPage({ searchParams }: PageProps<"/[locale]/admin/signalements">) {
  return (
    <>
      <TopBar back="/admin" title="Signalements" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <ReportsData searchParams={searchParams as Promise<{ vue?: string }>} />
      </Suspense>
    </>
  );
}
