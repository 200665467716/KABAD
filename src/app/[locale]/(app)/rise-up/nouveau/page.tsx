import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { ProjectForm } from "./ProjectForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rise.create");
  return { title: t("metaTitle") };
}

async function Gate() {
  await pageUser("/rise-up/nouveau");
  return <ProjectForm />;
}

/** Screen R3: launch a project and its channel. */
export default function NewProjectPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
