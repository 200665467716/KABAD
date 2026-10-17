import type { Metadata } from "next";
import { TopBar } from "@/components/shell/TopBar";
import { NotificationList } from "./NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <TopBar back="/accueil" title="Notifications" />
      <NotificationList />
    </>
  );
}
