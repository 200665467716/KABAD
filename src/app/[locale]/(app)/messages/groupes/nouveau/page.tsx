import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { listContacts } from "@/server/messaging";
import { NewGroupForm } from "./NewGroupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messaging.group");
  return { title: t("metaTitle") };
}

async function NewGroupData() {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/connexion?suite=/messages/groupes/nouveau", locale: await getLocale() });
  return <NewGroupForm contacts={await listContacts(user.id)} />;
}

export default function NewGroupPage() {
  return (
    <Suspense>
      <NewGroupData />
    </Suspense>
  );
}
