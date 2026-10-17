import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { challenge, challenges } from "@/lib/data";
import { SubmissionForm } from "./SubmissionForm";

export const metadata: Metadata = { title: "Ma solution" };

export function generateStaticParams() {
  return challenges.filter((c) => c.status === "open").map((c) => ({ id: c.id }));
}

export default async function SubmitPage({ params }: PageProps<"/defis/[id]/soumettre">) {
  const { id } = await params;
  const c = challenge(id);
  if (!c || c.status !== "open") notFound();
  return <SubmissionForm challengeId={c.id} title={c.title} closes={c.closes} hasCash={Boolean(c.pot)} />;
}
