"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useRealtime } from "@/lib/realtime-client";
import { agoLabel, isToday } from "@/lib/time";
import { useMe } from "@/lib/use-me";
import type { NotificationView } from "@/server/notifications";

const tones: Record<NotificationView["tone"], string> = {
  brand: "bg-brand-soft text-brand-text",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent-text",
  neutral: "bg-sunken text-muted",
};

export function NotificationList({ initial }: { initial: NotificationView[] }) {
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

  const groups = [
    { id: "today", label: "Aujourd’hui", items: visible.filter((n) => isToday(n.createdAt)) },
    { id: "before", label: "Plus tôt", items: visible.filter((n) => !isToday(n.createdAt)) },
  ].filter((g) => g.items.length > 0);

  return (
    <Page narrow>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filtrer les notifications"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "Toutes" },
            { value: "unread", label: "Non lues", count: unreadCount },
          ]}
        />
        <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={() => markRead()}>
          Tout marquer comme lu
        </Button>
      </div>
      {groups.length === 0 && <p className="py-10 text-center text-muted">{items.length === 0 ? "Aucune notification pour l’instant." : "Vous avez tout lu. Rien de nouveau pour l’instant."}</p>}
      {groups.map((g) => (
        <section key={g.id} className="grid gap-2" aria-labelledby={`g-${g.id}`}>
          <Overline as="h2" id={`g-${g.id}`}>
            {g.label}
          </Overline>
          <ul className="m-0 list-none divide-y divide-line rounded-lg border-2 border-line-strong bg-raised p-0">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => n.unread && markRead(n.id)} className="grid grid-cols-[40px_minmax(0,1fr)_8px] items-start gap-3 px-4 py-3.5 text-ink no-underline hover:bg-sunken/50">
                  <span className={cn("grid size-10 place-items-center rounded-full", tones[n.tone])}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <span className="grid gap-1">
                    <span className="text-sm">
                      <b>{n.actor}</b>
                      {n.text.startsWith(" :") ? "" : " "}
                      {n.text}
                    </span>
                    <span className="text-xs text-subtle tabular">{agoLabel(n.createdAt)}</span>
                  </span>
                  {n.unread ? <span className="mt-2 size-2 rounded-full bg-brand" aria-label="Non lue" /> : <span />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
