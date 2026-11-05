import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth";
import { listConversations, listInvitations } from "@/server/messaging";
import { Inbox } from "./Inbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.inbox");
  return { title: t("metaTitle") };
}

async function InboxData({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion?suite=/messages", locale: await getLocale() });
  // Former links to the invitations tab.
  if ((await searchParams).onglet === "invitations") redirect({ href: "/messages/invitations", locale: await getLocale() });
  const [conversations, invitations] = await Promise.all([listConversations(user.id), listInvitations(user.id)]);
  return <Inbox me={user.id} initialConversations={conversations} initialInvitations={invitations.received} initialSent={invitations.sent} />;
}

async function InboxSkeleton() {
  const t = await getTranslations("messaging.inbox");
  return (
    <>
      <TopBar title={t("title")} />
      <Page narrow>
        <div className="grid gap-px overflow-hidden rounded-lg border-2 border-line-strong" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-17 animate-pulse bg-raised" />
          ))}
        </div>
        <p className="sr-only" role="status">
          {t("loading")}
        </p>
      </Page>
    </>
  );
}

export default function MessagesPage({ searchParams }: PageProps<"/[locale]/messages">) {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData searchParams={searchParams} />
    </Suspense>
  );
}
