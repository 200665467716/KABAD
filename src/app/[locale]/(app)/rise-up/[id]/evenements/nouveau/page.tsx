import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { getProject } from "@/server/rise";
import { EventForm } from "./EventForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise.newEvent");
  return { title: t("metaTitle") };
}

/** Screen R5: a lead of the project schedules a meeting, on an external video link (D7). */
async function Gate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/rise-up/${id}/evenements/nouveau`);
  const project = await orNotFound(getProject(user.id, id));
  if (!project) notFound();
  // P5: the initiator and the co-leads schedule the events; the other members propose rooms.
  if (project.viewerRole !== "initiator" && project.viewerRole !== "co_lead") redirect({ href: `/rise-up/${id}`, locale: await getLocale() });
  return <EventForm projectId={id} projectName={project.name} others={project.members - 1} timeZone={user.timeZone} />;
}

export default function NewEventPage({ params }: PageProps<"/[locale]/rise-up/[id]/evenements/nouveau">) {
  return (
    <Suspense>
      <Gate params={params} />
    </Suspense>
  );
}
