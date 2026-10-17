import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { receivedReport, test } from "@/lib/data";
import { ReportReview } from "./ReportReview";

export const metadata: Metadata = { title: "Rapports reçus" };

export function generateStaticParams() {
  return [{ id: receivedReport.testId }];
}

export default async function ReportsPage({ params }: PageProps<"/tests/[id]/rapports">) {
  const { id } = await params;
  if (!test(id) || id !== receivedReport.testId) notFound();
  return <ReportReview testId={id} />;
}
