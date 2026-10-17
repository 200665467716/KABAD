import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { members } from "@/lib/data";
import { ProfileView } from "./ProfileView";

export function generateStaticParams() {
  return members.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: PageProps<"/profil/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = members.find((x) => x.id === id);
  return { title: m ? m.name : "Profil" };
}

export default async function ProfilePage({ params }: PageProps<"/profil/[id]">) {
  const { id } = await params;
  const m = members.find((x) => x.id === id);
  if (!m) notFound();
  return <ProfileView memberId={m.id} />;
}
