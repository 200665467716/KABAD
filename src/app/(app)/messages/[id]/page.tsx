import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { conversation, conversations } from "@/lib/data";
import { ConversationView } from "./ConversationView";

export function generateStaticParams() {
  return conversations.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/messages/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: conversation(id)?.name ?? "Conversation" };
}

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  if (!conversation(id)) notFound();
  return <ConversationView conversationId={id} />;
}
