"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useRealtime } from "@/lib/realtime-client";
import { useMe } from "@/lib/use-me";
import type { NotificationView } from "@/server/notifications";

const tones: Record<NotificationView["tone"], string> = {
  brand: "bg-header text-on-header",
  success: "bg-success-soft text-success",
  accent: "bg-accent text-on-accent",
  neutral: "bg-bg text-ink shadow-[inset_0_0_0_2px_var(--border-strong)]",
};

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function NotificationList({ initial }: { initial: NotificationView[] }) {
  const t = useTranslations("profile.notifications");
  const format = useFormatter();
  const now = useNow();
  const { refresh: refreshMe } = useMe();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = items.filter((n) => n.unread).length;
  const visible = items.filter((n) => filter === "all" || n.unread);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("filter")}
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: t("all") },
            { value: "unread", label: t("unread"), count: unreadCount },
          ]}
        />
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
          <ul className="m-0 list-none divide-y-2 divide-line overflow-hidden rounded-lg border-2 border-line-strong bg-raised p-0">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => n.unread && markRead(n.id)} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 px-3.5 py-3 text-ink no-underline hover:bg-bg">
                  <span className={cn("grid size-10 place-items-center rounded-full", tones[n.tone])}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <span className="text-sm leading-5">
                    <b>{n.actor}</b>
                    {/^[\s:]/.test(n.text) ? "" : " "}
                    {n.text}
                  </span>
                  <span className="grid justify-items-end gap-1.5">
                    <span className="text-xs text-muted tabular">{when(n)}</span>
                    {n.unread && <span className="size-2 rounded-full bg-danger" aria-label={t("unreadDot")} />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
