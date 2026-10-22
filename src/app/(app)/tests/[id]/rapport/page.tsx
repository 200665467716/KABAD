import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getTestApp } from "@/server/community-tests";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Rapport de test" };

async function ReportData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/tests/${id}/rapport`);
  const t = await orNotFound(getTestApp(user.id, id));
  if (!t) notFound();
  // The owner reads reports; a tester with a pending or validated report has nothing left to send.
  if (t.owner.id === user.id || t.myReport === "SUBMITTED" || t.myReport === "VALIDATED" || (t.slotsLeft === 0 && !t.myReport)) redirect(`/tests/${id}`);
  return <ReportForm app={t} />;
}

export default function ReportPage({ params }: PageProps<"/tests/[id]/rapport">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <ReportData params={params} />
    </Suspense>
  );
}
