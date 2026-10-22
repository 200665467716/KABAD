import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodeExcerpt } from "@/components/features/CodeExcerpt";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge } from "@/components/ui/Display";
import { formatNumber, initials } from "@/lib/format";
import { longDate } from "@/lib/time";
import { readCapsule } from "@/server/capsules";
import { orNotFound } from "@/server/messaging";
import { pageUser } from "@/server/page";
import { THEME_LABEL } from "../CapsuleList";

export const metadata: Metadata = { title: "Capsule" };

async function CapsuleData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await pageUser(`/capsules/${id}`);
  const c = await orNotFound(readCapsule(id));
  if (!c) notFound();
  return (
    <>
      <TopBar back="/capsules" plain />
      <Page narrow className="pt-0">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="brand">{THEME_LABEL[c.theme]}</Badge>
            {c.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.03em] lg:text-4xl">{c.title}</h1>
          <Link href={`/profil/${c.author.id}`} className="flex items-center gap-2 text-sm text-muted no-underline">
            <Avatar initials={initials(c.author.name)} size="sm" />
            {c.author.name} · {longDate(c.createdAt)} · {c.minutes} min · {formatNumber(c.reads)} lectures
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

export default function CapsulePage({ params }: PageProps<"/capsules/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted" role="status">Chargement de la capsule…</p>}>
      <CapsuleData params={params} />
    </Suspense>
  );
}
