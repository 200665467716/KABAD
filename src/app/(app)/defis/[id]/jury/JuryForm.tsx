"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, Meter } from "@/components/ui/Display";
import { TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { JURY_CRITERIA, totalScore, type JuryScore } from "@/lib/jury";
import type { JuryItem } from "@/lib/domain-types";

const START: JuryScore = { works: 3, code: 3, tests: 3, explain: 3 };

export function JuryForm({ challengeId, item }: { challengeId: string; item: JuryItem }) {
  const router = useRouter();
  const [score, setScore] = useState<JuryScore>(START);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = item.submission;

  async function save() {
    if (!s) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/challenges/${challengeId}/scores`, { body: { submissionId: s.id, ...score, comment } });
      setSaved(s.index);
      setScore(START);
      setComment("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "La note n’a pas été enregistrée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  if (!s) {
    return (
      <>
        <TopBar back={`/defis/${challengeId}`} title="Évaluation terminée" subtitle={item.challengeTitle} />
        <Page narrow className="flex-1">
          <Alert tone="success" title={item.total ? `Vous avez noté les ${item.total} solutions.` : "Aucune solution à noter."}>
            L’équipe KABAD publie les résultats quand les trois membres du jury ont terminé.
          </Alert>
        </Page>
        <ActionBar>
          <ButtonLink href="/defis" size="lg" block>
            Retour aux défis
          </ButtonLink>
        </ActionBar>
      </>
    );
  }

  return (
    <>
      <TopBar back={`/defis/${challengeId}`} title={`Solution n° ${s.index}`} subtitle={`${item.challengeTitle} · anonyme`} actions={<span className="pr-1 text-sm font-bold text-muted tabular">{item.scored} / {item.total}</span>}>
        <Meter value={item.total ? item.scored / item.total : 0} label="Solutions évaluées" height="h-1" />
      </TopBar>
      <Page narrow className="flex-1">
        <Alert tone="info">Vue réservée au jury. Les solutions sont anonymes : vous ne voyez ni le nom ni le pays du participant.</Alert>
        <div className="divide-y divide-line rounded-lg border border-line bg-raised">
          <a href={s.repoUrl} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
            <Icon name="code" size={18} className="text-muted" />
            <span className="flex-1 text-sm font-bold">Ouvrir le dépôt</span>
            <span className="max-w-[45%] truncate font-mono text-xs text-muted">{s.repoUrl.replace(/^https:\/\//, "")}</span>
          </a>
          {s.demoUrl && (
            <a href={s.demoUrl} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3 text-ink no-underline">
              <Icon name="link" size={18} className="text-muted" />
              <span className="flex-1 text-sm font-bold">Voir la démo</span>
              <Icon name="external" size={16} className="text-subtle" />
            </a>
          )}
        </div>
        <section className="grid gap-1">
          <h2 className="text-sm font-bold">Explication du participant</h2>
          <p className="rounded-md bg-sunken px-3.5 py-3 text-sm whitespace-pre-line">{s.explanation}</p>
        </section>
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
                    onClick={() => setScore((x) => ({ ...x, [c.id]: n }))}
                    className={cn("h-11 rounded-md border text-[15px] font-bold tabular transition-colors", on ? "border-brand bg-brand text-on-brand" : "border-line-strong bg-raised text-ink hover:bg-sunken")}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <TextArea id="comment" label="Commentaire pour le participant (facultatif)" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        <div aria-live="polite">
          {saved !== null && (
            <Alert tone="success" role="status">
              Note de la solution n° {saved} enregistrée.
            </Alert>
          )}
          {error && (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Page>
      <ActionBar className="grid-cols-[minmax(0,1fr)_auto] items-center">
        <div className="grid">
          <span className="text-xs text-muted">Votre note</span>
          <span className="font-display text-xl font-bold tabular">{totalScore(score)} / 20</span>
        </div>
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer et suivante"}
        </Button>
      </ActionBar>
    </>
  );
}
