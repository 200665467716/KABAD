import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "overview" },
  { href: "/admin/badges", label: "badges" },
  { href: "/admin/signalements", label: "reports" },
  { href: "/admin/membres", label: "members" },
  { href: "/admin/hackathons", label: "hackathons" },
  { href: "/admin/versements", label: "payouts" },
  { href: "/admin/journal", label: "journal" },
] as const;

/** `current` and `counts` take a tab address ("/admin/badges"). */
export function AdminNav({ current, counts }: { current: string; counts?: Partial<Record<string, number>> }) {
  const t = useTranslations("admin.nav");
  return (
    <nav aria-label={t("label")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={current === tab.href ? "page" : undefined}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-line-strong px-4 text-sm font-extrabold no-underline",
            current === tab.href ? "bg-ink text-raised" : "bg-raised text-ink hover:bg-bg",
          )}
        >
          {t(tab.label)}
          {counts?.[tab.href] ? <span className="rounded-full bg-danger px-1.5 text-[11px] leading-5 text-on-danger tabular">{counts[tab.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
