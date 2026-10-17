import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seniors } from "@/lib/data";
import { RequestForm } from "./RequestForm";

export const metadata: Metadata = { title: "Demande de mentorat" };

export function generateStaticParams() {
  return seniors().map((m) => ({ id: m.id }));
}

export default async function RequestPage({ params }: PageProps<"/mentorat/demande/[id]">) {
  const { id } = await params;
  if (!seniors().some((m) => m.id === id)) notFound();
  return <RequestForm mentorId={id} />;
}
