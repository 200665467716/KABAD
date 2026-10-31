import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Overline, Tag } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import { getBadgeRequest } from "@/server/badges";
import { adminUser } from "@/server/admin-page";
import { orNotFound } from "@/server/messaging";
import { BadgeDecision } from "./BadgeDecision";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.badges");
  return { title: t("detailTitle"), robots: { index: false } };
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await adminUser(`/admin/badges/${id}`);
  const r = await orNotFound(getBadgeRequest(user.id, id));
  if (!r) notFound();
  const [t, format] = await Promise.all([getTranslations("admin.badges"), getFormatter()]);
  const links = [
    { label: t("github"), url: r.githubUrl },
    { label: t("linkedin"), url: r.linkedinUrl },
    { label: t("portfolio"), url: r.portfolioUrl },
  ].filter((l): l is { label: string; url: string } => Boolean(l.url));
  const tone = r.status === "PENDING" ? "brand" : r.status === "APPROVED" ? "success" : "danger";
  return (
    <>
      <Page narrow className="gap-4">
        <div className="flex items-center gap-3 rounded-lg border-2 border-line-strong bg-raised p-3.5">
          <Avatar initials={initials(r.candidate.name)} size="lg" tone="brand" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <span className="font-display text-base font-bold">{r.candidate.name}</span>
            <span className="text-[13px] text-muted">
              {[r.candidate.city, r.candidate.country].filter(Boolean).join(", ")} · {t("sent", { when: format.relativeTime(new Date(r.createdAt)) })}
            </span>
          </div>
          <Badge tone={tone}>{t(`status.${r.status}`)}</Badge>
        </div>

        <section className="grid gap-1.5">
          <Overline>{t("expertise")}</Overline>
          <div className="flex flex-wrap gap-1.5">
            {r.domains.map((d) => (
              <Tag key={d} tone="brand">
                {d}
              </Tag>
            ))}
            {r.technologies.map((d) => (
              <Tag key={d}>{d}</Tag>
            ))}
          </div>
          <p className="text-sm">
            <b>{r.jobTitle}</b>
            {r.company ? ` · ${r.company}` : ""} · {t(`experience.${r.experience as "3-5" | "5-10" | "10+"}`)}
          </p>
        </section>

        <section className="grid gap-1.5">
          <Overline>{t("providedLinks")}</Overline>
          {links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border-2 border-line-strong bg-raised px-3 text-ink no-underline">
              <b className="text-[13px] text-muted">{l.label}</b>
              <span className="truncate text-sm font-bold">{l.url.replace(/^https:\/\//, "")}</span>
              <Icon name="external" size={18} />
            </a>
          ))}
        </section>

        <section className="grid gap-1.5">
          <Overline>{t("bio")}</Overline>
          <p className="text-sm">{r.bio}</p>
        </section>
        <section className="grid gap-1.5">
          <Overline>{t("topics")}</Overline>
          <p className="text-sm">{r.topics}</p>
        </section>
        {r.status === "REFUSED" && r.refusalReason && (
          <section className="grid gap-1.5">
            <Overline>{t("refusalReason")}</Overline>
            <p className="text-sm">{r.refusalReason}</p>
          </section>
        )}
        {r.reviewedAt && <p className="text-[13px] text-muted">{t("reviewedOn", { when: format.dateTime(new Date(r.reviewedAt), { day: "numeric", month: "long", year: "numeric" }) })}</p>}
      </Page>
      {r.status === "PENDING" && <BadgeDecision id={r.id} />}
    </>
  );
}

export default async function BadgeRequestPage({ params }: PageProps<"/[locale]/admin/badges/[id]">) {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar back="/admin/badges" backLabel={t("badges.backToList")} title={t("badges.detailTitle")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <Detail params={params} />
      </Suspense>
    </>
  );
}
