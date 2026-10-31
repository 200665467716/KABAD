import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pageUser } from "@/server/page";
import { CapsuleForm } from "./CapsuleForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("capsules.form");
  return { title: t("metaTitle") };
}

async function Gate() {
  const user = await pageUser("/capsules/nouvelle");
  if (user.role !== "SENIOR" || !user.seniorVerifiedAt) notFound();
  return <CapsuleForm />;
}

export default async function NewCapsulePage() {
  const t = await getTranslations("capsules.form");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <Gate />
    </Suspense>
  );
}
