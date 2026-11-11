"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Controls";
import { Alert, Avatar } from "@/components/ui/Display";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact } from "@/lib/messaging-types";

/**
 * H3: the captain picks the contacts to invite into the team. The sheet only chooses:
 * the caller sends the invitations (with the team at its creation, or at once from "Mon équipe").
 */
export function MatePicker({ open, onClose, exclude, max, busy, onPick }: { open: boolean; onClose: () => void; exclude: string[]; max: number; busy?: boolean; onPick: (chosen: Contact[]) => void }) {
  const t = useTranslations("hackathons.mates");
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<{ contacts: Contact[] }>("/api/contacts")
      .then((d) => alive && setContacts(d.contacts))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open]);

  const available = (contacts ?? []).filter((c) => !exclude.includes(c.id));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("title")}
      footer={
        <Button
          size="lg"
          block
          disabled={chosen.length === 0 || busy}
          onClick={() => {
            onPick(available.filter((c) => chosen.includes(c.id)));
            setChosen([]);
          }}
        >
          {t("invite", { count: chosen.length })}
        </Button>
      }
    >
      <p className="text-sm text-muted">{t("help", { max })}</p>
      {contacts === null && !failed && <p className="text-sm text-muted">{t("loading")}</p>}
      {contacts !== null && available.length === 0 && <p className="text-sm text-muted">{t("none")}</p>}
      {available.length > 0 && (
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {available.map((c) => {
            const on = chosen.includes(c.id);
            const full = !on && chosen.length >= max;
            return (
              <li key={c.id}>
                <label className={full ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-muted" : "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5"}>
                  <Avatar initials={initials(c.name)} src={c.photo} size="sm" />
                  <span className="grid">
                    <span className="text-sm font-bold">{c.name}</span>
                    <span className="text-xs text-muted">{c.city}</span>
                  </span>
                  <input type="checkbox" checked={on} disabled={full} onChange={() => setChosen((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))} className="size-5.5 accent-[var(--brand)]" aria-label={t("inviteLabel", { name: c.name })} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {failed && (
        <Alert tone="danger" role="alert">
          {t("loadError")}
        </Alert>
      )}
    </Sheet>
  );
}
