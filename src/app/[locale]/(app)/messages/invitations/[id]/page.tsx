import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { getInvitation, orNotFound } from "@/server/messaging";
import { InvitationView } from "./InvitationView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.invitation");
  return { title: t("metaTitle") };
}

async function Loading() {
  const t = await getTranslations("messaging.invitation");
  return (
    <p className="p-6 text-muted" role="status">
      {t("loading")}
    </p>
  );
}

async function InvitationData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: `/connexion?suite=/messages/invitations/${id}`, locale: await getLocale() });
  const invitation = await orNotFound(getInvitation(user.id, id));
  if (!invitation) notFound();
  if (invitation.status === "ACCEPTED" && invitation.conversationId) redirect({ href: `/messages/${invitation.conversationId}`, locale: await getLocale() });
  return <InvitationView invitation={invitation} />;
}

export default function InvitationPage({ params }: PageProps<"/[locale]/messages/invitations/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <InvitationData params={params} />
    </Suspense>
  );
}
