import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pair } from "@/lib/data";
import { SessionConfirm } from "./SessionConfirm";

export const metadata: Metadata = { title: "Séance de mentorat" };

export function generateStaticParams() {
  return pair.sessions.map((s) => ({ id: s.id }));
}

export default async function SessionPage({ params }: PageProps<"/mentorat/seances/[id]">) {
  const { id } = await params;
  if (!pair.sessions.some((s) => s.id === id)) notFound();
  return <SessionConfirm sessionId={id} />;
}
