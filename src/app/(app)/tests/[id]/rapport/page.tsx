import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { test, tests } from "@/lib/data";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Rapport de test" };

export function generateStaticParams() {
  return tests.map((t) => ({ id: t.id }));
}

export default async function ReportPage({ params }: PageProps<"/tests/[id]/rapport">) {
  const { id } = await params;
  const t = test(id);
  if (!t) notFound();
  return <ReportForm testId={t.id} />;
}
