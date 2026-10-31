import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Alert } from "@/components/ui/Display";
import { RegisterForm } from "@/components/features/hackathons/RegisterForm";
import { redirect } from "@/i18n/navigation";
import { formatDuration } from "@/lib/format";
import { getHackathon } from "@/server/hackathons";
import { eligibility } from "@/server/mentoring";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.register");
  return { title: t("title") };
}

async function Data({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/hackathons/${id}/participer`);
  const h = await orNotFound(getHackathon(user.id, id));
  if (!h) notFound();
  if (h.myTeam) redirect({ href: `/hackathons/${id}/equipe`, locale: await getLocale() });
  const t = await getTranslations("hackathons.register");
  const top = <TopBar back={`/hackathons/${id}`} title={t("title")} />;
  const open = h.published && h.status === "OPEN" && new Date(h.closesAt).getTime() > readClock();
  if (!open || h.amJuror) {
    return (
      <>
        {top}
        <Page narrow>
          <Alert tone="info">{h.amJuror ? t("juror") : t("closed")}</Alert>
        </Page>
      </>
    );
  }
  if (h.mentoringMinutes > 0) {
    const e = await eligibility(user.id, h.mentoringMinutes);
    if (!e.eligible) {
      return (
        <>
          {top}
          <Page narrow>
            <Alert tone="info" title={t("mentoringTitle", { duration: formatDuration(h.mentoringMinutes) })}>
              {t("mentoringMissing", { missing: formatDuration(e.missing) })}
            </Alert>
          </Page>
        </>
      );
    }
  }
  return (
    <>
      {top}
      <RegisterForm h={h} />
    </>
  );
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/hackathons/[id]/participer">) {
  const t = await getTranslations("hackathons.register");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <Data params={params} />
    </Suspense>
  );
}
