"use client";

import { useState } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Alert, Meter } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { JURY_CRITERIA, totalScore, type JuryScore } from "@/lib/jury";

const START: JuryScore = { works: 5, code: 4, tests: 3, explain: 4 };

export function JuryForm({ challengeTitle, total }: { challengeTitle: string; total: number }) {
  const [index, setIndex] = useState(12);
  const [score, setScore] = useState<JuryScore>(START);
  const [saved, setSaved] = useState<number | null>(null);

  return (
    <>
      <TopBar back="/defis" title={`Solution n° ${index}`} subtitle={`${challengeTitle} · anonyme`} actions={<span className="pr-1 text-sm font-bold text-muted tabular">{index} / {total}</span>}>
        <Meter value={index / total} label="Solutions évaluées" height="h-1" />
      </TopBar>
      <Page narrow className="flex-1">
        <Alert tone="info">Vue réservée au jury. Les solutions sont anonymes : vous ne voyez ni le nom ni le pays du participant.</Alert>
        <div className="divide-y divide-line rounded-lg border border-line bg-raised">
          <a href="#" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
            <Icon name="code" size={18} className="text-muted" />
            <span className="flex-1 text-sm font-bold">Ouvrir le dépôt</span>
            <span className="font-mono text-xs text-muted">github.com/…/short</span>
          </a>
          <a href="#" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
            <Icon name="link" size={18} className="text-muted" />
            <span className="flex-1 text-sm font-bold">Voir la démo</span>
            <Icon name="external" size={16} className="text-subtle" />
          </a>
        </div>
        {JURY_CRITERIA.map((c) => (
          <fieldset key={c.id} className="grid gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
              <span className="font-bold">{c.label}</span>
              <span className="text-xs text-muted">{c.hint}</span>
            </legend>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = score[c.id] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${c.label} : ${n} sur 5`}
                    onClick={() => setScore((s) => ({ ...s, [c.id]: n }))}
                    className={cn("h-11 rounded-md border text-[15px] font-bold tabular transition-colors", on ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-raised text-ink hover:bg-sunken")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <TextArea id="comment" label="Commentaire pour le participant" rows={3} defaultValue="Bonne gestion des collisions. Ajoutez un test pour les liens expirés." />
        {saved !== null && (
          <Alert tone="success" role="status">
            Note de la solution n° {saved} enregistrée.
          </Alert>
        )}
      </Page>
      <ActionBar className="grid-cols-[minmax(0,1fr)_auto] items-center">
        <div className="grid">
          <span className="text-xs text-muted">Votre note</span>
          <span className="font-display text-xl font-bold tabular">{totalScore(score)} / 20</span>
        </div>
        <Button
          onClick={() => {
            setSaved(index);
            setIndex((i) => Math.min(total, i + 1));
            setScore(START);
          }}
          disabled={index >= total && saved === total}
        >
          Enregistrer et suivante
        </Button>
      </ActionBar>
    </>
  );
}
