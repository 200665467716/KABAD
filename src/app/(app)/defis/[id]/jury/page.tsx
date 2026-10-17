import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { challenge, challenges } from "@/lib/data";
import { JuryForm } from "./JuryForm";

export const metadata: Metadata = { title: "Évaluation du jury" };

export function generateStaticParams() {
  return challenges.filter((c) => c.status === "jury").map((c) => ({ id: c.id }));
}

export default async function JuryPage({ params }: PageProps<"/defis/[id]/jury">) {
  const { id } = await params;
  const c = challenge(id);
  if (!c || c.status !== "jury") notFound();
  return <JuryForm challengeTitle={c.title} total={c.participants} />;
}
