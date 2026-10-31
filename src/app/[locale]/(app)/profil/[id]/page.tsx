import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProfile } from "@/server/members";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Profil" };

async function ProfileData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/profil/${id}`);
  const profile = await orNotFound(getProfile(user.id, id));
  if (!profile) notFound();
  return <ProfileView profile={profile} isMe={user.id === id} isAdmin={user.isAdmin} />;
}

export default function ProfilePage({ params }: PageProps<"/[locale]/profil/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement du profil…</p>}>
      <ProfileData params={params} />
    </Suspense>
  );
}
