import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppTile } from "@/components/features/AppTile";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Alert, TagList } from "@/components/ui/Display";
import { getTestApp } from "@/server/community-tests";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { TestActions } from "./TestActions";
import { ScreenSkeleton } from "@/components/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tests.detail");
  return { title: t("metaTitle") };
}

/** Screen T2: the listing, its steps to tick and the testers' group. */
async function TestData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser(`/tests/${id}`);
  const a = await orNotFound(getTestApp(user.id, id));
  if (!a) notFound();
  const t = await getTranslations("tests");
  const owner = a.owner.id === user.id;
  return (
    <>
      <TopBar back="/tests" title={t("detail.header")} />
      <Page narrow className="flex-1">
        <section className="flex items-center gap-3.5">
          <AppTile app={a} size="lg" />
          <div className="grid min-w-0 gap-1">
            <h2 className="font-display text-xl font-extrabold">{a.name}</h2>
            <span className="text-sm text-muted">
              {t.rich("detail.byLine", { name: a.owner.name, b: (c) => <b className="text-ink">{c}</b> })}
              {a.owner.city ? ` · ${a.owner.city}` : ""}
            </span>
            <TagList items={[...a.platforms.map((p) => t(`platform.${p}`)), t("minutes", { count: a.minutes })]} />
          </div>
        </section>
        <p className="text-[15px] leading-[22px]">{a.pitch}</p>
        {a.myReport === "SUBMITTED" && <Alert tone="info">{t("detail.reportSent", { name: a.owner.name.split(" ")[0] })}</Alert>}
        {a.myReport === "VALIDATED" && <Alert tone="success">{t("detail.reportValidated")}</Alert>}
        {a.myReport === "REFUSED" && <Alert tone="danger">{t("detail.reportRefused")}</Alert>}
        <TestActions app={a} owner={owner} />
      </Page>
    </>
  );
}

async function Loading() {
  const t = await getTranslations("tests.detail");
  return (
    <ScreenSkeleton label={t("loading")} />
  );
}

export default function TestPage({ params }: PageProps<"/[locale]/tests/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <TestData params={params} />
    </Suspense>
  );
}
