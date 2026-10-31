import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { TestAppForm } from "./TestAppForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tests.form");
  return { title: t("metaTitle") };
}

async function Gate() {
  await pageUser("/tests/nouveau");
  return <TestAppForm />;
}

export default function NewTestAppPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
