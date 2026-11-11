"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { disconnectRealtime } from "@/lib/realtime-client";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/use-me";
import { Avatar } from "../ui/Display";
import { Icon, type IconName } from "../ui/Icon";
import { Wordmark } from "../ui/Logo";
import { hardNavigate } from "@/lib/hard-navigate";
import { salonsEnabled } from "@/lib/features";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Label = "home" | "mentoring" | "hackathons" | "riseUp" | "tests" | "messages" | "members" | "voiceRooms";
type Item = { href: string; label: Label; icon: IconName; match: string[] };

/* Bottom bar of the design: Accueil · Mentorat · Hackathons · Rise-Up · Messages. */
const items: Item[] = [
  { href: "/accueil", label: "home", icon: "home", match: ["/accueil", "/notifications", "/profil"] },
  { href: "/mentorat", label: "mentoring", icon: "users", match: ["/mentorat"] },
  { href: "/hackathons", label: "hackathons", icon: "trophy", match: ["/hackathons"] },
  { href: "/rise-up", label: "riseUp", icon: "rise", match: ["/rise-up"] },
  { href: "/messages", label: "messages", icon: "message", match: ["/messages"] },
];

/** The side bar on computers also lists the secondary spaces. */
const sideItems: Item[] = [
  ...items,
  { href: "/tests", label: "tests", icon: "clipboard", match: ["/tests"] },
  { href: "/membres", label: "members", icon: "userPlus", match: ["/membres"] },
  ...(salonsEnabled ? [{ href: "/salons", label: "voiceRooms", icon: "radio", match: ["/salons"] } satisfies Item] : []),
];

/** Screens that focus on one task show their own action bar instead of the tab bar. */
const focused = [
  /^\/mentorat\/(mentors\/[^/]+(\/reserver)?|seances\/.+|badge|disponibilites)$/,
  /^\/admin\/badges\/.+/,
  /^\/hackathons\/(organiser|missions\/.+|[^/]+\/(participer|soumettre|jury|instructeurs))$/,
  // A project channel writes at the bottom of the screen, like a conversation.
  /^\/rise-up\/.+/,
  /^\/tests\/(nouveau|[^/]+\/(rapport|rapports))$/,
  /^\/messages\/(?!$).+/,
  /^\/profil\/modifier$/,
];

function isActive(path: string, it: Item) {
  return it.match.some((m) => path === m || path.startsWith(m + "/"));
}

export function BottomNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  const { me } = useMe();
  const unread = me?.unreadMessages ?? 0;
  if (focused.some((re) => re.test(path))) return null;
  return (
    <nav aria-label={t("label")} className="sticky bottom-0 z-20 grid grid-cols-5 gap-1 border-t-2 border-line-strong bg-raised px-2.5 pt-2 safe-bottom lg:hidden">
      {items.map((it) => {
        const active = isActive(path, it);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative grid h-14 min-w-0 content-center justify-items-center gap-[3px] rounded-2xl text-[11px] leading-[15px] font-bold tracking-[-0.01em] no-underline", active ? "bg-brand text-on-brand" : "text-muted")}
          >
            <Icon name={it.icon} size={20} />
            {t(it.label)}
            {it.href === "/messages" && unread > 0 ? (
              <span className="absolute top-1 left-[calc(50%+6px)] h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] leading-5 font-extrabold text-on-danger tabular" aria-label={t("unreadMessages", { count: unread })}>
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
  const t = useTranslations("nav");
  const path = usePathname();
  const { me } = useMe();
  const unread = me?.unreadMessages ?? 0;
  return (
    <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-6 overflow-y-auto border-r-2 border-line-strong bg-raised px-4 py-6 lg:flex">
      <Link href="/accueil" className="px-2 text-ink no-underline">
        <Wordmark />
      </Link>
      <nav aria-label={t("label")} className="grid gap-1">
        {sideItems.map((it) => {
          const active = isActive(path, it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", active ? "bg-brand text-on-brand" : "text-muted hover:bg-bg hover:text-ink")}
            >
              <Icon name={it.icon} />
              {t(it.label)}
              {it.href === "/messages" && unread > 0 ? <span className="ml-auto h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 text-on-danger tabular">{unread > 99 ? "99+" : unread}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-1">
        <LanguageSwitcher className="px-2 pb-2" />
        <Link href="/notifications" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/notifications" ? "bg-brand text-on-brand" : "text-muted hover:bg-bg hover:text-ink")}>
          <Icon name="bell" />
          {t("notifications")}
          {me && me.unreadNotifications > 0 ? (
            <span className="ml-auto h-5 min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 text-on-danger tabular" aria-label={t("unreadNotifications", { count: me.unreadNotifications })}>
              {me.unreadNotifications > 99 ? "99+" : me.unreadNotifications}
            </span>
          ) : null}
        </Link>
        {me && (
          <Link href="/compte" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/compte" ? "bg-brand text-on-brand" : "text-muted hover:bg-bg hover:text-ink")}>
            <Icon name="user" />
            {t("account")}
          </Link>
        )}
        {me?.isAdmin && (
          <Link href="/admin" className={cn("flex h-11 items-center gap-3 rounded-md px-3 font-bold no-underline", path === "/admin" ? "bg-brand text-on-brand" : "text-muted hover:bg-bg hover:text-ink")}>
            <Icon name="lock" />
            {t("admin")}
          </Link>
        )}
        {me ? (
          <div className="flex items-center gap-1">
            <Link href={`/profil/${me.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-ink no-underline hover:bg-bg">
              <Avatar initials={initials(me.name)} size="sm" tone="accent" />
              <span className="grid min-w-0">
                <span className="truncate text-sm font-bold">{me.name}</span>
                <span className="text-xs text-muted">
                  {me.city ? `${me.city} · ` : ""}
                  {me.role === "SENIOR" ? t("senior") : t("junior")}
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label={t("signOut")}
              title={t("signOut")}
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" }).catch(() => {});
                disconnectRealtime();
                // A full page load clears everything the previous member had in memory.
                hardNavigate("/connexion");
              }}
              className="inline-grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        ) : (
          <Link href="/connexion" className="flex h-11 items-center gap-3 rounded-md px-3 font-bold text-brand-text no-underline hover:bg-bg">
            <Icon name="user" />
            {t("signIn")}
          </Link>
        )}
      </div>
    </aside>
  );
}
