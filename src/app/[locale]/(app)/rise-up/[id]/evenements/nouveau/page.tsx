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

/** Screen R5: a member schedules a meeting of the project, on an external video link (D7). */
async function Gate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/rise-up/${id}/evenements/nouveau`);
  const project = await orNotFound(getProject(user.id, id));
  if (!project) notFound();
  if (!project.isMember) redirect({ href: `/rise-up/${id}`, locale: await getLocale() });
  return <EventForm projectId={id} projectName={project.name} others={project.members - 1} />;
}

export default function NewEventPage({ params }: PageProps<"/[locale]/rise-up/[id]/evenements/nouveau">) {
  return (
    <Suspense>
      <Gate params={params} />
    </Suspense>
  );
}
