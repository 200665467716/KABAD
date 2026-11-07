import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { listTestApps } from "@/server/community-tests";
import { pageUser } from "@/server/page";
import { TestList } from "./TestList";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tests");
  return { title: t("metaTitle") };
}

async function TestsData() {
  const user = await pageUser("/tests");
  const { toTest, testing, mine } = await listTestApps(user.id);
  return <TestList toTest={toTest} testing={testing} mine={mine} />;
}

async function Loading() {
  const t = await getTranslations("tests");
  return (
    <ScreenSkeleton label={t("loading")} />
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TestsData />
    </Suspense>
  );
}
