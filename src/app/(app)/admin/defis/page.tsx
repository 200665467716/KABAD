import type { Metadata } from "next";
import { Suspense } from "react";
import { Page, TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { adminChallenges } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";
import { ChallengeAdmin } from "./ChallengeAdmin";

export const metadata: Metadata = { title: "Défis · Équipe", robots: { index: false } };

async function ChallengesData() {
  const user = await adminUser("/admin/defis");
  return (
    <Page>
      <AdminNav current="/admin/defis" />
      <ButtonLink href="/admin/defis/nouveau" icon="plus" className="justify-self-start">
        Créer un défi
      </ButtonLink>
      <ChallengeAdmin challenges={await adminChallenges(user.id)} />
    </Page>
  );
}

export default function AdminChallengesPage() {
  return (
    <>
      <TopBar back="/admin" title="Défis" />
      <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
        <ChallengesData />
      </Suspense>
    </>
  );
}
