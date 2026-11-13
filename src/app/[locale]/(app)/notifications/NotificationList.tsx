"use client";

import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { messageValues } from "@/lib/notification-text";
import { useCallback, useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useRealtime } from "@/lib/realtime-client";
import { useMe } from "@/lib/use-me";
import type { NotificationView } from "@/server/notifications";

/*
 * Each notification takes the colour of its feature (P2), read from the screen it opens:
 * mentoring indigo, hackathons ink, Rise-Up maize (the only place for maize), tests palm, messages mist.
 * A warning from the team keeps the clay tone.
 */
const featureTone = (n: NotificationView) => {
  if (n.tone === "neutral" && n.href.startsWith("/compte")) return "bg-danger-soft text-danger";
  if (n.href.startsWith("/mentorat")) return "bg-header text-on-header";
  if (n.href.startsWith("/hackathons")) return "bg-ink text-raised";
  if (n.href.startsWith("/rise-up")) return "bg-accent text-on-accent";
  if (n.href.startsWith("/tests")) return "bg-success-soft text-success";
  if (n.href.startsWith("/messages")) return "bg-[var(--mist)] text-brand-text";
  return "bg-bg text-ink shadow-[inset_0_0_0_2px_var(--border-strong)]";
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function NotificationList({ initial }: { initial: NotificationView[] }) {
  const t = useTranslations("profile.notifications");
  const kinds = useTranslations("notifications.kinds");
  const locale = useLocale();
  // In the reader's language when the notification has a key; older ones keep their French text.
  const textOf = (n: NotificationView) => (n.key && kinds.has(n.key) ? kinds(n.key, messageValues(n.params, locale)) : n.text);
  const format = useFormatter();
  const now = useNow();
  const { refresh: refreshMe } = useMe();
  const [items, setItems] = useState(initial);
  const unreadCount = items.filter((n) => n.unread).length;
  const visible = items;

  const reload = useCallback(() => {
    api<NotificationView[]>("/api/notifications")
      .then(setItems)
      .catch(() => {});
  }, []);
  useRealtime("notification:new", reload);

  function markRead(id?: string) {
    setItems((list) => list.map((n) => (!id || n.id === id ? { ...n, unread: false } : n)));
    api("/api/notifications", { body: id ? { id } : {} })
      .then(refreshMe)
      .catch(() => {});
  }

  const today = dayStart(now);
  const age = (n: NotificationView) => today - dayStart(new Date(n.createdAt));
  const groups = [
    { id: "today", label: t("today"), items: visible.filter((n) => age(n) <= 0) },
    { id: "week", label: t("week"), items: visible.filter((n) => age(n) > 0 && age(n) < 7 * 86_400_000) },
    { id: "earlier", label: t("earlier"), items: visible.filter((n) => age(n) >= 7 * 86_400_000) },
  ].filter((g) => g.items.length > 0);
  const when = (n: NotificationView) => {
    const d = new Date(n.createdAt);
    return age(n) <= 0 ? format.dateTime(d, { hour: "2-digit", minute: "2-digit" }) : format.dateTime(d, age(n) < 7 * 86_400_000 ? { weekday: "short" } : { day: "numeric", month: "short" });
  };

  return (
    <Page narrow>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={() => markRead()}>
          {t("markAll")}
        </Button>
      </div>
      {groups.length === 0 && <p className="py-10 text-center text-muted">{items.length === 0 ? t("none") : t("allRead")}</p>}
      {groups.map((g) => (
        <section key={g.id} className="grid gap-2" aria-labelledby={`g-${g.id}`}>
          <Overline as="h2" id={`g-${g.id}`}>
            {g.label}
          </Overline>
          <ul className="kb-stagger m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => n.unread && markRead(n.id)}
                  className={cn("relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg", n.unread && "bg-brand-soft")}
                >
                  {/* Unread: a tinted row, a dot and the word itself, never the colour alone. */}
                  {n.unread && <span className="absolute top-1/2 left-1 size-2 -translate-y-1/2 rounded-full bg-danger" aria-hidden="true" />}
                  <span className={cn("grid size-10 place-items-center rounded-md", featureTone(n))}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <span className="text-sm leading-5">
                    {n.unread && <span className="sr-only">{t("unreadDot")} : </span>}
                    <b>{n.actor}</b>
                    {/^[\s:]/.test(textOf(n)) ? "" : " "}
                    {textOf(n)}
                    {n.unread && (
                      <span className="font-extrabold text-danger" aria-hidden="true">
                        {" "}
                        · {t("unreadDot")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted tabular">{when(n)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
