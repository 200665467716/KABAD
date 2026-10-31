import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { listCapsules } from "@/server/capsules";
import { pageUser } from "@/server/page";
import { CapsuleList } from "./CapsuleList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("capsules");
  return { title: t("metaTitle") };
}

async function CapsulesData() {
  const user = await pageUser("/capsules");
  const t = await getTranslations("capsules");
  const canPublish = user.role === "SENIOR" && user.seniorVerifiedAt !== null;
  return (
    <>
      <TopBar
        back="/mentorat"
        title={t("title")}
        actions={
          canPublish ? (
            <ButtonLink href="/capsules/nouvelle" size="sm" icon="plus">
              {t("publish")}
            </ButtonLink>
          ) : undefined
        }
      />
      <CapsuleList capsules={await listCapsules()} />
    </>
  );
}

export default async function CapsulesPage() {
  const t = await getTranslations("capsules");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <CapsulesData />
    </Suspense>
  );
}
