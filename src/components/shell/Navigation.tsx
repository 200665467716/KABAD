"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Avatar } from "../ui/Display";
import { Icon, type IconName } from "../ui/Icon";
import { Wordmark } from "../ui/Logo";

type Item = { href: string; label: string; icon: IconName; match: string[]; count?: number };

const items: Item[] = [
  { href: "/accueil", label: "Accueil", icon: "home", match: ["/accueil", "/notifications", "/profil"] },
  { href: "/mentorat", label: "Mentorat", icon: "screen", match: ["/mentorat", "/capsules"] },
  { href: "/defis", label: "Défis", icon: "trophy", match: ["/defis"] },
  { href: "/tests", label: "Tests", icon: "clipboard", match: ["/tests"] },
  { href: "/messages", label: "Messages", icon: "message", match: ["/messages"], count: 3 },
];

/** Screens that focus on one task show their own action bar instead of the tab bar. */
const focused = [
  /^\/mentorat\/demande\//,
  /^\/mentorat\/seances\//,
  /^\/defis\/[^/]+(\/(soumettre|jury))?$/,
  /^\/tests\/[^/]+(\/rapport|\/rapports)?$/,
  /^\/messages\/(?!$).+/,
  /^\/profil\//,
];

function isActive(path: string, it: Item) {
  return it.match.some((m) => path === m || path.startsWith(m + "/"));
}

export function BottomNav() {
  const path = usePathname();
  if (focused.some((re) => re.test(path))) return null;
  return (
    <nav aria-label="Navigation principale" className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-line bg-raised px-2 pt-1 safe-bottom lg:hidden">
      {items.map((it) => {
        const active = isActive(path, it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative grid justify-items-center gap-0.5 rounded-md py-2 text-[11px] leading-[14px] font-bold", active ? "text-brand-text" : "text-muted")}
          >
            {active && <span className="absolute top-0 h-[3px] w-6 rounded-b-xs bg-brand" />}
            <Icon name={it.icon} />
            {it.label}
            {it.count ? <span className="absolute top-1.5 left-[calc(50%+6px)] h-4 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-on-danger tabular">{it.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-6 border-r border-line bg-raised px-4 py-6 lg:flex">
      <Link href="/accueil" className="px-2 text-ink no-underline">
        <Wordmark />
      </Link>
      <nav aria-label="Navigation principale" className="grid gap-0.5">
        {[...items, { href: "/capsules", label: "Capsules", icon: "capsule" as IconName, match: ["/capsules"] }].map((it) => {
          const active = it.href === "/mentorat" ? path === "/mentorat" || (path.startsWith("/mentorat/") && !path.startsWith("/capsules")) : isActive(path, it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-sunken hover:text-ink")}
            >
              <Icon name={it.icon} />
              {it.label}
              {it.count ? <span className="ml-auto h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 text-on-danger tabular">{it.count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-1">
        <Link href="/notifications" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/notifications" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-sunken hover:text-ink")}>
          <Icon name="bell" />
          Notifications
          <span className="ml-auto size-2 rounded-full bg-danger" aria-label="4 nouvelles" />
        </Link>
        <Link href="/profil/kossi" className="flex items-center gap-3 rounded-md p-2 text-ink no-underline hover:bg-sunken">
          <Avatar initials="KM" size="sm" tone="accent" />
          <span className="grid min-w-0">
            <span className="truncate text-sm font-bold">Kossi Mensah</span>
            <span className="text-xs text-muted">Lomé · Junior</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
