import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eligibility, getSession } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { SessionConfirm } from "./SessionConfirm";

export const metadata: Metadata = { title: "Séance de mentorat" };

async function SessionData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/seances/${id}`);
  const found = await orNotFound(getSession(user.id, id));
  if (!found) notFound();
  const e = found.pair.iAm === "MENTEE" ? await eligibility(user.id) : null;
  return <SessionConfirm session={found.session} pair={found.pair} eligibility={e} />;
}

export default function SessionPage({ params }: PageProps<"/mentorat/seances/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement de la séance…</p>}>
      <SessionData params={params} />
    </Suspense>
  );
}
