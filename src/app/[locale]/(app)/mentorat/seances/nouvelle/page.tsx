import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPair } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { SessionForm } from "../SessionForm";

export const metadata: Metadata = { title: "Noter une séance" };

async function NewSessionData({ searchParams }: { searchParams: Promise<{ binome?: string }> }) {
  const user = await pageUser("/mentorat");
  const { binome } = await searchParams;
  if (!binome) notFound();
  const pair = await orNotFound(getPair(user.id, binome));
  if (!pair) notFound();
  return <SessionForm pairId={pair.id} project={pair.project} />;
}

export default function NewSessionPage({ searchParams }: PageProps<"/[locale]/mentorat/seances/nouvelle">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <NewSessionData searchParams={searchParams as Promise<{ binome?: string }>} />
    </Suspense>
  );
}
