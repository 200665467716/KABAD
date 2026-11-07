import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { listNotifications } from "@/server/notifications";
import { pageUser } from "@/server/page";
import { NotificationList } from "./NotificationList";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.notifications"))("title") };
}

async function NotificationsData() {
  const user = await pageUser("/notifications");
  return <NotificationList initial={await listNotifications(user.id)} />;
}

/** Screen P2. */
export default async function NotificationsPage() {
  const t = await getTranslations("profile");
  return (
    <>
      <TopBar back="/accueil" title={t("notifications.title")} />
      <Suspense fallback={<ScreenSkeleton label={t("loading")} />}>
        <NotificationsData />
      </Suspense>
    </>
  );
}
