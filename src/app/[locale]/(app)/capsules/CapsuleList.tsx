"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { CodeExcerpt } from "@/components/features/CodeExcerpt";
import { Page } from "@/components/shell/TopBar";
import { ToggleChip } from "@/components/ui/Controls";
import { Avatar, Badge } from "@/components/ui/Display";
import { formatNumber, initials } from "@/lib/format";
import type { CapsuleView } from "@/lib/domain-types";

export const THEME_LABEL: Record<CapsuleView["theme"], string> = { BACKEND: "Back-end", MOBILE: "Mobile", CAREER: "Carrière" };
const THEMES = ["ALL", "BACKEND", "MOBILE", "CAREER"] as const;

export function CapsuleList({ capsules }: { capsules: CapsuleView[] }) {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("ALL");
  const list = capsules.filter((c) => theme === "ALL" || c.theme === theme);
  return (
    <Page>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Thèmes">
        {THEMES.map((t) => (
          <ToggleChip key={t} pressed={theme === t} onClick={() => setTheme(t)}>
            {t === "ALL" ? "Tout" : THEME_LABEL[t]}
          </ToggleChip>
        ))}
      </div>
      <p className="text-sm text-muted">Ce que les seniors ont appris, en moins de 5 minutes.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <Link key={c.id} href={`/capsules/${c.id}`} className="grid content-start overflow-hidden rounded-lg border-2 border-line-strong bg-raised text-ink no-underline shadow-sm transition-colors hover:border-line-strong">
            {c.code && <CodeExcerpt source={c.code} />}
            <div className="grid gap-2 p-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="brand">{THEME_LABEL[c.theme]}</Badge>
                {c.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <h2 className="font-display text-lg font-bold">{c.title}</h2>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Avatar initials={initials(c.author.name)} size="sm" />
                  {c.author.name} · {c.minutes} min
                </span>
                <span className="text-xs text-muted tabular">{formatNumber(c.reads)} lectures</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-muted">Aucune capsule dans ce thème pour l’instant.</p>}
    </Page>
  );
}
