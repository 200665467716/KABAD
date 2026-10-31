import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { Page, TopBar } from "@/components/shell/TopBar";
import { Avatar } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { BadgeStatus } from "@/lib/domain-types";
import { listBadgeRequests } from "@/server/badges";
import { adminUser } from "@/server/admin-page";
import { AdminNav } from "../AdminNav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.badges");
  return { title: t("metaTitle"), robots: { index: false } };
}

const TABS: Array<{ status: BadgeStatus; param: string }> = [
  { status: "PENDING", param: "" },
  { status: "APPROVED", param: "validees" },
  { status: "REFUSED", param: "refusees" },
];

async function BadgesData({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const user = await adminUser("/admin/badges");
  const { onglet } = await searchParams;
  const tab = TABS.find((x) => x.param === (onglet ?? "")) ?? TABS[0];
  const [{ items, counts }, t, format] = await Promise.all([listBadgeRequests(user.id, tab.status), getTranslations("admin.badges"), getFormatter()]);
  return (
    <Page>
      <AdminNav current="/admin/badges" counts={{ "/admin/badges": counts.PENDING ?? 0 }} />
      <h2 className="font-display text-md font-extrabold uppercase">{t("heading")}</h2>
      <nav aria-label={t("filter")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((x) => (
          <Link
            key={x.status}
            href={x.param ? `/admin/badges?onglet=${x.param}` : "/admin/badges"}
            aria-current={x.status === tab.status ? "page" : undefined}
            className={cn("inline-flex h-11 shrink-0 items-center rounded-full border-2 border-line-strong px-4 text-sm font-extrabold no-underline", x.status === tab.status ? "bg-ink text-raised" : "bg-raised text-ink")}
          >
            {t(`tabs.${x.status}`, { count: counts.PENDING ?? 0 })}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="py-8 text-center text-muted">{t("empty")}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border-2 border-line-strong bg-raised">
          {items.map((r) => {
            const links = [r.githubUrl, r.linkedinUrl, r.portfolioUrl].filter(Boolean).length;
            return (
              <li key={r.id} className="border-line [&+&]:border-t-2">
                <Link href={`/admin/badges/${r.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3.5 text-ink no-underline hover:bg-bg">
                  <Avatar initials={initials(r.candidate.name)} size="lg" tone="brand" />
                  <span className="grid min-w-0 gap-0.5">
                    <b className="truncate text-[15px]">{r.candidate.name}</b>
                    <span className="truncate text-[13px] text-muted">{r.domains.join(" · ")}</span>
                    <span className="text-xs font-extrabold text-brand-text">
                      {t("sent", { when: format.relativeTime(new Date(r.createdAt)) })} · {t("links", { count: links })}
                    </span>
                  </span>
                  <Icon name="chevron" size={18} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[13px] leading-[18px] text-muted">{t("hint")}</p>
    </Page>
  );
}

export default async function AdminBadgesPage({ searchParams }: PageProps<"/[locale]/admin/badges">) {
  const t = await getTranslations("admin");
  return (
    <>
      <TopBar back="/admin" title={t("title")} />
      <Suspense fallback={<p className="p-6 text-muted" role="status">{t("loading")}</p>}>
        <BadgesData searchParams={searchParams as Promise<{ onglet?: string }>} />
      </Suspense>
    </>
  );
}
