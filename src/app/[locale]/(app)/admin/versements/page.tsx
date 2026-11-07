import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Page, TopBar } from "@/components/shell/TopBar";
import { adminUser } from "@/server/admin-page";
import { adminOverview, CONTEST_HOURS } from "@/server/hackathons";
import { AdminNav } from "../AdminNav";
import { PayoutList } from "./PayoutList";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hackathons.payouts");
  return { title: t("title"), robots: { index: false } };
}

async function Data() {
  const user = await adminUser("/admin/versements");
  const [t, { payouts }] = await Promise.all([getTranslations("hackathons.payouts"), adminOverview(user.id)]);
  return (
    <Page narrow>
      <AdminNav current="/admin/versements" />
      <p className="text-sm text-muted">{t("help", { hours: CONTEST_HOURS })}</p>
      <PayoutList payouts={payouts} />
    </Page>
  );
}

export default async function PayoutsPage() {
  const t = await getTranslations("hackathons.payouts");
  return (
    <>
      <TopBar back="/admin" title={t("title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <Data />
      </Suspense>
    </>
  );
}
