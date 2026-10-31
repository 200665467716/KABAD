import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconButton } from "@/components/ui/Button";
import { TopBar } from "@/components/shell/TopBar";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { getProject } from "@/server/rise";
import { ProjectView } from "./ProjectView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise.project");
  return { title: t("metaTitle") };
}

/** Screen R2: a project, its live room or next event, its discussion, events and members. */
/** Read once per request on the server, so the relative times match between server and browser. */
const serverNow = () => Date.now();

async function ProjectData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/rise-up/${id}`);
  const project = await orNotFound(getProject(user.id, id));
  if (!project) notFound();
  const t = await getTranslations("rise.project");
  return (
    <>
      <TopBar back="/rise-up" title={t("header")} actions={project.isMember ? <IconButton icon="plus" label={t("schedule")} href={`/rise-up/${id}/evenements/nouveau`} /> : undefined} />
      <ProjectView project={project} viewerId={user.id} now={serverNow()} />
    </>
  );
}

async function Loading() {
  const t = await getTranslations("rise.project");
  return (
    <p className="p-6 text-muted" role="status">
      {t("loading")}
    </p>
  );
}

export default function ProjectPage({ params }: PageProps<"/[locale]/rise-up/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProjectData params={params} />
    </Suspense>
  );
}
