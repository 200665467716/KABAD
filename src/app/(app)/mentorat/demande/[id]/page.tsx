import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProfile } from "@/server/members";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "Demande de mentorat" };

async function RequestData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/mentorat/demande/${id}`);
  const mentor = await orNotFound(getProfile(user.id, id));
  if (!mentor || !mentor.verified || mentor.id === user.id) notFound();
  return <RequestForm mentor={mentor} />;
}

export default function RequestPage({ params }: PageProps<"/mentorat/demande/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <RequestData params={params} />
    </Suspense>
  );
}
