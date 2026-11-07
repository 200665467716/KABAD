import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { listBlocked } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { AccountSettings } from "./AccountSettings";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.account"))("title") };
}

async function AccountData() {
  const user = await pageUser("/compte");
  return <AccountSettings email={user.email} hasPassword={user.passwordHash !== null} verified={user.emailVerifiedAt !== null} profileId={user.id} blocked={await listBlocked(user.id)} />;
}

export default async function AccountPage() {
  const t = await getTranslations("profile");
  return (
    <>
      <TopBar back="/profil" title={t("account.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <AccountData />
      </Suspense>
    </>
  );
}
