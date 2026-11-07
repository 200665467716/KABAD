import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth";
import { listInvitations } from "@/server/messaging";
import { InvitationsView } from "./InvitationsView";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.invitations");
  return { title: t("metaTitle") };
}

/** Screen MS2: invitations received (answer them here) and sent (still waiting). */
async function InvitationsData() {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion?suite=/messages/invitations", locale: await getLocale() });
  const { received, sent } = await listInvitations(user.id);
  return <InvitationsView received={received} sent={sent} />;
}

async function Loading() {
  const t = await getTranslations("messaging.invitations");
  return (
    <ScreenSkeleton label={t("loading")} />
  );
}

export default function InvitationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InvitationsData />
    </Suspense>
  );
}
