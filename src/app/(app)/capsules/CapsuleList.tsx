"use client";

import { useState } from "react";
import { Page } from "@/components/shell/TopBar";
import { ToggleChip } from "@/components/ui/Controls";
import { Avatar, Badge, Card } from "@/components/ui/Display";
import { capsules, member, type Capsule } from "@/lib/data";
import { formatNumber, initials } from "@/lib/format";

const THEMES: Array<"Tout" | Capsule["theme"]> = ["Tout", "Back-end", "Mobile", "Carrière"];

function Code({ source }: { source: string }) {
  // Minimal highlighting for keywords and strings, enough for a short capsule excerpt.
  const parts = source.split(/('[^']*'|\/\/.*$|\b(?:const|await|if|return)\b)/gm);
  return (
    <pre className="m-0 overflow-x-auto bg-code px-4 py-3.5 font-mono text-[13px] leading-5 text-on-code">
      {parts.map((p, i) =>
        /^(const|await|if|return)$/.test(p) ? (
          <span key={i} className="text-[var(--maize-300)]">{p}</span>
        ) : p.startsWith("'") ? (
          <span key={i} className="text-[var(--palm-300)]">{p}</span>
        ) : p.startsWith("//") ? (
          <span key={i} className="text-[var(--neutral-400)]">{p}</span>
        ) : (
          p
        ),
      )}
    </pre>
  );
}

export function CapsuleList() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("Tout");
  const list = capsules.filter((c) => theme === "Tout" || c.theme === theme);
  return (
    <Page>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Thèmes">
        {THEMES.map((t) => (
          <ToggleChip key={t} pressed={theme === t} onClick={() => setTheme(t)}>
            {t}
          </ToggleChip>
        ))}
      </div>
      <p className="text-sm text-muted">Ce que les seniors ont appris, en moins de 5 minutes. Les thèmes sont proposés automatiquement, puis vérifiés par l’auteur.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => {
          const a = member(c.authorId);
          return (
            <Card key={c.id} interactive className="content-start gap-0 overflow-hidden p-0">
              {c.code && <Code source={c.code} />}
              <div className="grid gap-2 p-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">{c.theme}</Badge>
                  {c.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <h2 className="font-display text-lg font-bold">{c.title}</h2>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Avatar initials={initials(a.name)} size="sm" />
                    {a.name} · {c.minutes} min
                  </span>
                  <span className="text-xs text-muted tabular">{formatNumber(c.reads)} lectures</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
