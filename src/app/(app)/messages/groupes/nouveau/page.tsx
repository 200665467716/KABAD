import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { listContacts } from "@/server/messaging";
import { NewGroupForm } from "./NewGroupForm";

export const metadata: Metadata = { title: "Nouveau groupe" };

async function NewGroupData() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?suite=/messages/groupes/nouveau");
  return <NewGroupForm contacts={await listContacts(user.id)} />;
}

export default function NewGroupPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement de vos contacts…</p>}>
      <NewGroupData />
    </Suspense>
  );
}
