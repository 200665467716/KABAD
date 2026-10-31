import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DomainError } from "@/server/errors";
import { nextForJury } from "@/server/challenges";
import { pageUser } from "@/server/page";
import { JuryForm } from "./JuryForm";

export const metadata: Metadata = { title: "Évaluation du jury" };

async function JuryData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/defis/${id}/jury`);
  const item = await nextForJury(user.id, id).catch((e) => {
    if (e instanceof DomainError && (e.status === 403 || e.status === 404)) return null;
    throw e;
  });
  if (!item) notFound();
  return <JuryForm challengeId={id} item={item} />;
}

export default function JuryPage({ params }: PageProps<"/[locale]/defis/[id]/jury">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement de la solution…</p>}>
      <JuryData params={params} />
    </Suspense>
  );
}
