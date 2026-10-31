import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { getCurrentUser } from "@/server/auth";
import { listConversations, listInvitations } from "@/server/messaging";
import { Inbox } from "./Inbox";

export const metadata: Metadata = { title: "Messages" };

async function InboxData() {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion?suite=/messages", locale: await getLocale() });
  const [conversations, invitations] = await Promise.all([listConversations(user.id), listInvitations(user.id)]);
  return <Inbox me={user.id} initialConversations={conversations} initialInvitations={invitations.received} initialSent={invitations.sent} />;
}

function InboxSkeleton() {
  return (
    <>
      <TopBar title="Messages" />
      <Page narrow>
        <div className="grid gap-px overflow-hidden rounded-lg border border-line" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-17 animate-pulse bg-raised" />
          ))}
        </div>
        <p className="sr-only" role="status">
          Chargement des conversations…
        </p>
      </Page>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData />
    </Suspense>
  );
}
