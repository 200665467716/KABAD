import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodeExcerpt } from "@/components/features/CodeExcerpt";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import { readCapsule } from "@/server/capsules";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("capsules.detail");
  return { title: t("metaTitle") };
}

async function CapsuleData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pageUser(`/capsules/${id}`);
  const c = await orNotFound(readCapsule(id));
  if (!c) notFound();
  const t = await getTranslations("capsules");
  const format = await getFormatter();
  return (
    <>
      <TopBar back="/capsules" plain />
      <Page narrow className="pt-0">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="brand">{t(`theme.${c.theme}`)}</Badge>
            {c.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-4xl">{c.title}</h1>
          <Link href={`/profil/${c.author.id}`} className="flex items-center gap-2 text-sm text-muted no-underline">
            <Avatar initials={initials(c.author.name)} size="sm" />
            {c.author.name} · {format.dateTime(new Date(c.createdAt), { day: "numeric", month: "long" })} · {t("minutes", { count: c.minutes })} · {t("reads", { count: c.reads })}
          </Link>
        </div>
        <div className="grid gap-4 text-[17px] leading-7">
          {c.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        {c.code && (
          <div className="overflow-hidden rounded-lg">
            <CodeExcerpt source={c.code} />
          </div>
        )}
      </Page>
    </>
  );
}

export default async function CapsulePage({ params }: PageProps<"/[locale]/capsules/[id]">) {
  const t = await getTranslations("capsules.detail");
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
      <CapsuleData params={params} />
    </Suspense>
  );
}
