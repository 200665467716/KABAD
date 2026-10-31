"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CodeExcerpt } from "@/components/features/CodeExcerpt";
import { Page } from "@/components/shell/TopBar";
import { ToggleChip } from "@/components/ui/Controls";
import { Avatar, Badge } from "@/components/ui/Display";
import { initials } from "@/lib/format";
import type { CapsuleView } from "@/lib/domain-types";

const THEMES = ["ALL", "BACKEND", "MOBILE", "CAREER"] as const;

export function CapsuleList({ capsules }: { capsules: CapsuleView[] }) {
  const tr = useTranslations("capsules");
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("ALL");
  const list = capsules.filter((c) => theme === "ALL" || c.theme === theme);
  return (
    <Page>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={tr("themesLabel")}>
        {THEMES.map((t) => (
          <ToggleChip key={t} pressed={theme === t} onClick={() => setTheme(t)}>
            {t === "ALL" ? tr("all") : tr(`theme.${t}`)}
          </ToggleChip>
        ))}
      </div>
      <p className="text-sm text-muted">{tr("intro")}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <Link key={c.id} href={`/capsules/${c.id}`} className="grid content-start overflow-hidden rounded-lg border-2 border-line-strong bg-raised text-ink no-underline shadow-sm transition-colors hover:border-line-strong">
            {c.code && <CodeExcerpt source={c.code} />}
            <div className="grid gap-2 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="brand">{tr(`theme.${c.theme}`)}</Badge>
                {c.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <h2 className="font-display text-lg font-bold">{c.title}</h2>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Avatar initials={initials(c.author.name)} size="sm" />
                  {c.author.name} · {tr("minutes", { count: c.minutes })}
                </span>
                <span className="text-xs text-muted tabular">{tr("reads", { count: c.reads })}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-muted">{tr("empty")}</p>}
    </Page>
  );
}
