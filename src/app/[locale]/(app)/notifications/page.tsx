import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { listNotifications } from "@/server/notifications";
import { pageUser } from "@/server/page";
import { NotificationList } from "./NotificationList";

export const metadata: Metadata = { title: "Notifications" };

async function NotificationsData() {
  const user = await pageUser("/notifications");
  return <NotificationList initial={await listNotifications(user.id)} />;
}

export default function NotificationsPage() {
  return (
    <>
      <TopBar back="/accueil" title="Notifications" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement des notifications…</p>}>
        <NotificationsData />
      </Suspense>
    </>
  );
}
