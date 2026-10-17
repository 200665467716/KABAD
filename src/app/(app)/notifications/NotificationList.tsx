"use client";

import Link from "next/link";
import { useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Overline } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { notifications, type NotificationItem } from "@/lib/data";

const tones: Record<NotificationItem["tone"], string> = {
  brand: "bg-brand-soft text-brand-text",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent-text",
  neutral: "bg-sunken text-muted",
};

export function NotificationList() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [read, setRead] = useState<string[]>([]);
  const isUnread = (n: NotificationItem) => n.unread && !read.includes(n.id);
  const unreadCount = notifications.filter(isUnread).length;
  const visible = notifications.filter((n) => filter === "all" || isUnread(n));

  const groups = [
    { id: "today", label: "Aujourd’hui", items: visible.filter((n) => n.group === "today") },
    { id: "week", label: "Cette semaine", items: visible.filter((n) => n.group === "week") },
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
        <Button variant="ghost" size="sm" disabled={unreadCount === 0} onClick={() => setRead(notifications.map((n) => n.id))}>
          Tout marquer comme lu
        </Button>
      </div>
      {groups.length === 0 && <p className="py-10 text-center text-muted">Vous avez tout lu. Rien de nouveau pour l’instant.</p>}
      {groups.map((g) => (
        <section key={g.id} className="grid gap-2" aria-labelledby={`g-${g.id}`}>
          <Overline as="h2" id={`g-${g.id}`}>
            {g.label}
          </Overline>
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line bg-raised p-0">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => setRead((r) => [...r, n.id])} className="grid grid-cols-[40px_minmax(0,1fr)_8px] items-start gap-3 px-4 py-3.5 text-ink no-underline hover:bg-sunken/50">
                  <span className={cn("grid size-10 place-items-center rounded-full", tones[n.tone])}>
                    <Icon name={n.icon} size={18} />
                  </span>
                  <span className="grid gap-1">
                    <span className="text-sm">
                      <b>{n.who}</b>
                      {n.what.startsWith(" :") ? "" : " "}
                      {n.what}
                    </span>
                    <span className="text-xs text-subtle tabular">{n.when}</span>
                  </span>
                  {isUnread(n) ? <span className="mt-2 size-2 rounded-full bg-brand" aria-label="Non lue" /> : <span />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
