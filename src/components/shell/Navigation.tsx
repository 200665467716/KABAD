"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { disconnectRealtime } from "@/lib/realtime-client";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/use-me";
import { Avatar } from "../ui/Display";
import { Icon, type IconName } from "../ui/Icon";
import { Wordmark } from "../ui/Logo";
import { hardNavigate } from "@/lib/hard-navigate";

type Item = { href: string; label: string; icon: IconName; match: string[] };

const items: Item[] = [
  { href: "/accueil", label: "Accueil", icon: "home", match: ["/accueil", "/notifications", "/profil"] },
  { href: "/mentorat", label: "Mentorat", icon: "screen", match: ["/mentorat", "/capsules"] },
  { href: "/defis", label: "Défis", icon: "trophy", match: ["/defis"] },
  { href: "/tests", label: "Tests", icon: "clipboard", match: ["/tests"] },
  { href: "/messages", label: "Messages", icon: "message", match: ["/messages"] },
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
  const { me } = useMe();
  const unread = me?.unreadMessages ?? 0;
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
            {it.href === "/messages" && unread > 0 ? (
              <span className="absolute top-1.5 left-[calc(50%+6px)] h-4 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-on-danger tabular" aria-label={`${unread} messages non lus`}>
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  const { me } = useMe();
  const unread = me?.unreadMessages ?? 0;
  return (
    <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-6 border-r border-line bg-raised px-4 py-6 lg:flex">
      <Link href="/accueil" className="px-2 text-ink no-underline">
        <Wordmark />
      </Link>
      <nav aria-label="Navigation principale" className="grid gap-0.5">
        {[...items, { href: "/membres", label: "Membres", icon: "users" as IconName, match: ["/membres"] }, { href: "/salons", label: "Salons vocaux", icon: "radio" as IconName, match: ["/salons"] }, { href: "/capsules", label: "Capsules", icon: "capsule" as IconName, match: ["/capsules"] }].map((it) => {
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
              {it.href === "/messages" && unread > 0 ? <span className="ml-auto h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 text-on-danger tabular">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-1">
        <Link href="/notifications" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/notifications" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-sunken hover:text-ink")}>
          <Icon name="bell" />
          Notifications
          {me && me.unreadNotifications > 0 ? (
            <span className="ml-auto h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 text-on-danger tabular" aria-label={`${me.unreadNotifications} non lues`}>
              {me.unreadNotifications > 99 ? "99+" : me.unreadNotifications}
            </span>
          ) : null}
        </Link>
        {me && (
          <Link href="/compte" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/compte" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-sunken hover:text-ink")}>
            <Icon name="user" />
            Mon compte
          </Link>
        )}
        {me?.isAdmin && (
          <Link href="/admin" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/admin" ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-sunken hover:text-ink")}>
            <Icon name="lock" />
            Équipe KABAD
          </Link>
        )}
        {me ? (
          <div className="flex items-center gap-1">
            <Link href={`/profil/${me.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-ink no-underline hover:bg-sunken">
              <Avatar initials={initials(me.name)} size="sm" tone="accent" />
              <span className="grid min-w-0">
                <span className="truncate text-sm font-bold">{me.name}</span>
                <span className="text-xs text-muted">
                  {me.city ? `${me.city} · ` : ""}
                  {me.role === "SENIOR" ? "Senior" : "Junior"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" }).catch(() => {});
                disconnectRealtime();
                // A full page load clears everything the previous member had in memory.
                hardNavigate("/connexion");
              }}
              className="inline-grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        ) : (
          <Link href="/connexion" className="flex h-11 items-center gap-3 rounded-md px-3 font-bold text-brand-text no-underline hover:bg-sunken">
            <Icon name="user" />
            Se connecter
          </Link>
        )}
      </div>
    </aside>
  );
}
