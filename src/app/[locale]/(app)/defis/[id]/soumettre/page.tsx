import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { dateAndHour } from "@/lib/time";
import { getChallenge } from "@/server/challenges";
import { eligibility } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { SubmissionForm } from "./SubmissionForm";

export const metadata: Metadata = { title: "Ma solution" };

async function SubmitData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/defis/${id}/soumettre`);
  const c = await orNotFound(getChallenge(user.id, id));
  if (!c || c.status !== "OPEN" || c.amJuror) notFound();
  if (c.requiresMentoring && !(await eligibility(user.id)).eligible) redirect({ href: `/defis/${id}`, locale: await getLocale() });
  return <SubmissionForm challengeId={c.id} title={c.title} closes={dateAndHour(c.closesAt)} hasCash={c.kind !== "LOT"} initial={c.mySubmission} />;
}

export default function SubmitPage({ params }: PageProps<"/[locale]/defis/[id]/soumettre">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <SubmitData params={params} />
    </Suspense>
  );
}
