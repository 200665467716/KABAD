import type { Metadata } from "next";
import { Suspense } from "react";
import { verifiedSeniors } from "@/server/admin";
import { adminUser } from "@/server/admin-page";
import { NewChallengeForm } from "./NewChallengeForm";

export const metadata: Metadata = { title: "Nouveau défi · Équipe", robots: { index: false } };

async function Data() {
  const user = await adminUser("/admin/defis/nouveau");
  return <NewChallengeForm seniors={await verifiedSeniors(user.id)} />;
}

export default function NewChallengePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <Data />
    </Suspense>
  );
}
