import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProfile } from "@/server/members";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { ProfileView } from "./ProfileView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.public"))("title") };
}

async function ProfileData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/profil/${id}`);
  const profile = await orNotFound(getProfile(user.id, id));
  if (!profile) notFound();
  return <ProfileView profile={profile} isMe={user.id === id} />;
}

export default async function ProfilePage({ params }: PageProps<"/[locale]/profil/[id]">) {
  const t = await getTranslations("profile");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <ProfileData params={params} />
    </Suspense>
  );
}
