import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { getConversation, orNotFound } from "@/server/messaging";
import { ConversationView } from "./ConversationView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.conversation");
  return { title: t("metaTitle") };
}

async function Loading() {
  const t = await getTranslations("messaging.conversation");
  return (
    <div className="grid h-dvh place-items-center text-muted" role="status">
      {t("loading")}
    </div>
  );
}

async function ConversationData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: `/connexion?suite=/messages/${id}`, locale: await getLocale() });
  const conversation = await orNotFound(getConversation(user.id, id));
  if (!conversation) notFound();
  return <ConversationView me={{ id: user.id, name: user.name }} initial={conversation} />;
}

export default function ConversationPage({ params }: PageProps<"/[locale]/messages/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ConversationData params={params} />
    </Suspense>
  );
}
