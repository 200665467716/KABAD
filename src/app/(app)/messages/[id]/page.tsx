import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { getConversation, orNotFound } from "@/server/messaging";
import { ConversationView } from "./ConversationView";

export const metadata: Metadata = { title: "Conversation" };

async function ConversationData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=/messages/${id}`);
  const conversation = await orNotFound(getConversation(user.id, id));
  if (!conversation) notFound();
  return <ConversationView me={{ id: user.id, name: user.name }} initial={conversation} />;
}

export default function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center text-muted" role="status">
          Chargement de la conversation…
        </div>
      }
    >
      <ConversationData params={params} />
    </Suspense>
  );
}
