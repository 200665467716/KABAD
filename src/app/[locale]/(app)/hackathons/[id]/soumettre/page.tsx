import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Alert } from "@/components/ui/Display";
import { SubmissionForm } from "@/components/features/hackathons/SubmissionForm";
import { redirect } from "@/i18n/navigation";
import { getHackathon } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.submit");
  return { title: t("title") };
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/soumettre`);
  const h = await orNotFound(getHackathon(user.id, id));
  if (!h) notFound();
  if (!h.myTeam) redirect({ href: `/hackathons/${id}`, locale: await getLocale() });
  const team = h.myTeam!;
  const t = await getTranslations("hackathons.submit");
  const top = <TopBar back={`/hackathons/${id}/equipe`} title={t("title")} />;
  const open = h.status === "OPEN" && new Date(h.startsAt).getTime() <= readClock();
  if (!open) {
    return (
      <>
        {top}
        <Page narrow>
          <Alert tone="info">{h.status === "OPEN" ? t("notStarted") : t("closed")}</Alert>
        </Page>
      </>
    );
  }
  return (
    <>
      {top}
      <SubmissionForm hackathonId={id} heading={`${team.name} · ${h.title}`} hasCash={h.prizeKind === "CAGNOTTE" || h.prizeKind === "SPONSORISE"} initial={team.submission} />
    </>
  );
}

export default async function SubmitPage({ params }: PageProps<"/[locale]/hackathons/[id]/soumettre">) {
  const t = await getTranslations("hackathons.submit");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <Data params={params} />
    </Suspense>
  );
}
