import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { pageUser } from "@/server/page";
import { ProfileEditor } from "./ProfileEditor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile.edit"))("title") };
}

async function EditorData() {
  const u = await pageUser("/profil/modifier");
  return <ProfileEditor initial={{ country: u.country, city: u.city, level: u.level, headline: u.headline, bio: u.bio, profileLink: u.profileLink, stack: u.stack, goals: u.goals }} />;
}

export default async function EditProfilePage() {
  const t = await getTranslations("profile");
  return (
    <>
      <TopBar back="/profil" title={t("edit.title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <EditorData />
      </Suspense>
    </>
  );
}
