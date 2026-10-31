import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { TopBar } from "@/components/shell/TopBar";
import { listBlocked } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { AccountSettings } from "./AccountSettings";

export const metadata: Metadata = { title: "Mon compte" };

async function AccountData() {
  const user = await pageUser("/compte");
  return <AccountSettings email={user.email} hasPassword={user.passwordHash !== null} github={user.githubLogin} verified={user.emailVerifiedAt !== null} profileId={user.id} blocked={await listBlocked(user.id)} />;
}

export default function AccountPage() {
  return (
    <>
      <TopBar back="/accueil" title="Mon compte" actions={<LanguageSwitcher compact />} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <AccountData />
      </Suspense>
    </>
  );
}
