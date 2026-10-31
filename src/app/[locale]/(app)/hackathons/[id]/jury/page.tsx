import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { JuryForm } from "@/components/features/hackathons/JuryForm";
import { DomainError } from "@/server/errors";
import { nextForJury } from "@/server/hackathons";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.jury");
  return { title: t("title") };
}

async function JuryData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/jury`);
  const item = await nextForJury(user.id, id).catch((e) => {
    if (e instanceof DomainError && (e.status === 403 || e.status === 404)) return null;
    throw e;
  });
  if (!item) notFound();
  return <JuryForm hackathonId={id} item={item} />;
}

export default async function JuryPage({ params }: PageProps<"/[locale]/hackathons/[id]/jury">) {
  const t = await getTranslations("hackathons.jury");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <JuryData params={params} />
    </Suspense>
  );
}
