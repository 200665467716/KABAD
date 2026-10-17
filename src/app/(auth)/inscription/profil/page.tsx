import type { Metadata } from "next";
import { ProfileSetup } from "./ProfileSetup";

export const metadata: Metadata = { title: "Votre profil" };

export default function ProfileSetupPage() {
  return <ProfileSetup />;
}
