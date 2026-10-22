import type { Metadata } from "next";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { ProfileSetup } from "./ProfileSetup";

export const metadata: Metadata = { title: "Votre profil" };

async function ProfileSetupData() {
  const u = await pageUser("/inscription/profil");
  // A profile already filled in means the member came to edit it, not to finish signing up.
  const editing = Boolean(u.city);
  return (
    <ProfileSetup
      editing={editing}
      initial={{ role: u.role, country: u.country, city: u.city, diaspora: u.diaspora, stack: u.stack, profileLink: u.profileLink, headline: u.headline, bio: u.bio, years: u.years }}
      profileHref={`/profil/${u.id}`}
    />
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement…</p>}>
      <ProfileSetupData />
    </Suspense>
  );
}
