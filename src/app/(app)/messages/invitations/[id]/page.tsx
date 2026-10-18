import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { getInvitation, orNotFound } from "@/server/messaging";
import { InvitationView } from "./InvitationView";

export const metadata: Metadata = { title: "Invitation" };

async function InvitationData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=/messages/invitations/${id}`);
  const invitation = await orNotFound(getInvitation(user.id, id));
  if (!invitation) notFound();
  if (invitation.status === "ACCEPTED" && invitation.conversationId) redirect(`/messages/${invitation.conversationId}`);
  return <InvitationView invitation={invitation} />;
}

export default function InvitationPage({ params }: PageProps<"/messages/invitations/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement de l’invitation…</p>}>
      <InvitationData params={params} />
    </Suspense>
  );
}
