import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { invitations } from "@/lib/data";
import { InvitationView } from "./InvitationView";

export const metadata: Metadata = { title: "Invitation" };

export function generateStaticParams() {
  return invitations.map((i) => ({ id: i.id }));
}

export default async function InvitationPage({ params }: PageProps<"/messages/invitations/[id]">) {
  const { id } = await params;
  if (!invitations.some((i) => i.id === id)) notFound();
  return <InvitationView invitationId={id} />;
}
