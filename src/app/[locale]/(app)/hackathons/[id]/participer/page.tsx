import { readClock } from "@/components/features/hackathons/clock";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Alert } from "@/components/ui/Display";
import { RegisterForm } from "@/components/features/hackathons/RegisterForm";
import { redirect } from "@/i18n/navigation";
import { avatarUrl } from "@/lib/avatar";
import { getHackathon } from "@/server/hackathons";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

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
  return (
    <>
      {top}
      <RegisterForm h={h} me={{ name: user.name, photo: avatarUrl(user) }} />
    </>
  );
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/hackathons/[id]/participer">) {
  const t = await getTranslations("hackathons.register");
  return (
    <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
      <Data params={params} />
    </Suspense>
  );
}
