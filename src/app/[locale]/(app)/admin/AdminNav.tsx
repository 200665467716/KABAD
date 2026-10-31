import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "Vue d’ensemble" },
  { href: "/admin/signalements", label: "Signalements" },
  { href: "/admin/membres", label: "Membres" },
  { href: "/admin/defis", label: "Défis" },
  { href: "/admin/versements", label: "Versements" },
  { href: "/admin/journal", label: "Journal" },
] as const;

export function AdminNav({ current, counts }: { current: (typeof TABS)[number]["href"]; counts?: Partial<Record<(typeof TABS)[number]["href"], number>> }) {
  return (
    <nav aria-label="Administration" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={current === t.href ? "page" : undefined}
          className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold no-underline", current === t.href ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-raised text-ink hover:bg-sunken")}
        >
          {t.label}
          {counts?.[t.href] ? <span className="rounded-full bg-danger px-1.5 text-xs leading-5 text-on-danger tabular">{counts[t.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
