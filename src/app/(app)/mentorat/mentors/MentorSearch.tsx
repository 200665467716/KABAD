"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Avatar, Badge, Card, PersonRow } from "@/components/ui/Display";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { Mentor } from "@/lib/domain-types";

const FILTERS = [
  { id: "open", label: "Disponible" },
  { id: "ts", label: "TypeScript" },
  { id: "diaspora", label: "Diaspora" },
  { id: "mobile", label: "Mobile" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export function MentorSearch({ mentors }: { mentors: Mentor[] }) {
  const [query, setQuery] = useState("");
  const [on, setOn] = useState<Record<FilterId, boolean>>({ open: true, ts: false, diaspora: false, mobile: false });

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return mentors.filter((m) => {
      if (on.open && !m.openSlots) return false;
      if (on.ts && !m.stack.includes("TypeScript")) return false;
      if (on.diaspora && !m.diaspora) return false;
      if (on.mobile && !m.stack.some((s) => /Flutter|React Native/.test(s))) return false;
      if (!q) return true;
      return [m.name, m.city, m.country, ...m.stack].some((v) => v.toLocaleLowerCase("fr").includes(q));
    });
  }, [mentors, query, on]);

  return (
    <Page>
      <div className="grid gap-3">
        <label className="flex h-11 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-muted focus-within:border-focus focus-within:outline-2 focus-within:outline-focus">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un mentor" placeholder="Technologie, ville, nom…" className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-subtle" />
        </label>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtres">
          {FILTERS.map((f) => (
            <ToggleChip key={f.id} pressed={on[f.id]} onClick={() => setOn((o) => ({ ...o, [f.id]: !o[f.id] }))}>
              {f.label}
            </ToggleChip>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted tabular" aria-live="polite">
        {list.length} mentor{list.length > 1 ? "s" : ""} correspond{list.length > 1 ? "ent" : ""}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((m) => (
          <Card key={m.id} className="content-start gap-3 px-4 py-3.5">
            <PersonRow avatar={<Avatar initials={initials(m.name)} size="lg" />} name={m.name} badge={<Badge tone="brand">Senior</Badge>} meta={`${m.city}${m.diaspora ? " · Diaspora" : ""} · ${m.years} ans · ${m.stats.hours} h confirmées`} />
            <p className="text-sm">{m.bio}</p>
            <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <span className={cn("size-2 rounded-full", m.openSlots ? "bg-success" : "bg-subtle")} />
                {m.openSlots ? `${m.openSlots} place${m.openSlots > 1 ? "s" : ""} libre${m.openSlots > 1 ? "s" : ""}` : "Complet"}
              </span>
              <ButtonLink href={`/profil/${m.id}`} size="sm" variant="secondary">
                Voir le profil
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-muted">Aucun mentor ne correspond. Retirez un filtre pour élargir la recherche.</p>}
    </Page>
  );
}
