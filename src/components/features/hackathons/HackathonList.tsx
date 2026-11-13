"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToggleChip } from "@/components/ui/Controls";
import { SectionLink } from "@/components/ui/Display";
import type { HackathonFormat, HackathonSummary } from "@/lib/domain-types";
import { HackathonTicket } from "./HackathonTicket";

const FILTERS = ["ALL", "ONLINE", "ONSITE", "HYBRID"] as const;

/** H1: hackathons by state, filtered by format. */
export function HackathonList({ hackathons, now }: { hackathons: HackathonSummary[]; now: number }) {
  const t = useTranslations("hackathons.list");
  const tf = useTranslations("hackathons.format");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const shown = hackathons.filter((h) => filter === "ALL" || h.format === (filter as HackathonFormat));
  const open = shown.filter((h) => h.status === "OPEN" && new Date(h.closesAt).getTime() > now);
  const running = shown.filter((h) => h.status === "OPEN" && new Date(h.closesAt).getTime() <= now);
  const jury = shown.filter((h) => h.status === "JURY");
  const done = shown.filter((h) => h.status === "DONE");
  const groups = [
    { id: "open", title: t("open"), items: open },
    { id: "running", title: t("running"), items: running },
    { id: "jury", title: t("jury"), items: jury },
    { id: "done", title: t("done"), items: done },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <div role="group" aria-label={t("filter")} className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pr-4 lg:mr-0 lg:flex-wrap">
        {FILTERS.map((f) => (
          <ToggleChip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "ALL" ? t("all") : tf(f)}
          </ToggleChip>
        ))}
      </div>
      {groups.length === 0 && <p className="py-8 text-center text-muted">{t("empty")}</p>}
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`h-${g.id}`} className="grid gap-3">
          <SectionLink id={`h-${g.id}`} title={g.title} />
          <div className="kb-stagger grid gap-3 lg:grid-cols-2">
            {g.items.map((h) => (
              <HackathonTicket key={h.id} h={h} now={now} href={h.status === "DONE" ? `/hackathons/${h.id}/resultats` : undefined} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
