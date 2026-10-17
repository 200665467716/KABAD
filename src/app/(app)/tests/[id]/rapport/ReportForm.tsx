"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { member, test } from "@/lib/data";

type Shot = { name: string; url: string };

export function ReportForm({ testId }: { testId: string }) {
  const t = test(testId)!;
  const owner = member(t.ownerId).name.split(" ")[0];
  const [shots, setShots] = useState<Shot[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function addShots(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    setShots((s) => [...s, ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))].slice(0, t.steps.length));
    e.target.value = "";
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (shots.length < t.steps.length) return setError(`Ajoutez ${t.steps.length} captures, une par étape du scénario.`);
    if (t.questions.some((_, i) => !answers[i]?.trim())) return setError("Répondez aux questions de contrôle.");
    setError(null);
    setSent(true);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={`/tests/${t.id}`} close title="Votre rapport" subtitle={t.name} />
      <Page narrow className="flex-1">
        {sent ? (
          <Alert tone="success" role="status" title="Rapport envoyé.">
            {owner} le lit puis le valide. Vous recevrez une notification.
          </Alert>
        ) : (
          <>
            <section className="grid gap-2" aria-labelledby="shots">
              <div className="flex items-baseline justify-between">
                <h2 id="shots" className="text-sm font-bold">
                  Captures d’écran
                </h2>
                <span className="text-xs text-muted tabular">
                  {shots.length} sur {t.steps.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shots.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element -- local previews from the user's own files
                  <img key={s.url} src={s.url} alt={s.name} className="h-26 w-16 rounded-md border border-line object-cover" />
                ))}
                {shots.length < t.steps.length && (
                  <label className="grid h-26 w-16 cursor-pointer place-items-center content-center gap-1 rounded-md border-[1.5px] border-dashed border-line-strong bg-raised text-center text-[11px] leading-[14px] font-bold text-muted focus-within:outline-2 focus-within:outline-focus">
                    <Icon name="plus" size={18} />
                    Étape {shots.length + 1}
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={addShots} />
                  </label>
                )}
              </div>
            </section>
            {t.questions.map((q, i) =>
              q.options ? (
                <fieldset key={q.q} className="grid gap-2">
                  <legend className="mb-2 text-sm font-bold">
                    {i + 1}. {q.q}
                  </legend>
                  {q.options.map((o) => (
                    <RadioCard key={o} name={`q${i}`} value={o} checked={answers[i] === o} onChange={() => setAnswers((a) => ({ ...a, [i]: o }))} heading={<span className="font-normal">{o}</span>} className="py-2.5" />
                  ))}
                </fieldset>
              ) : (
                <TextField key={q.q} id={`q${i}`} label={`${i + 1}. ${q.q}`} value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} />
              ),
            )}
            <TextArea id="remarks" label="Vos remarques" rows={4} placeholder="Ce qui vous a bloqué, ce qui était clair…" />
            {error && (
              <Alert tone="danger" role="alert">
                {error}
              </Alert>
            )}
          </>
        )}
      </Page>
      <ActionBar>
        {sent ? (
          <ButtonLink href="/tests" size="lg" block>
            Retour aux tests
          </ButtonLink>
        ) : (
          <>
            <Button type="submit" size="lg" block>
              Envoyer le rapport
            </Button>
            <p className="text-center text-xs text-muted">{owner} valide votre rapport après l’avoir lu.</p>
          </>
        )}
      </ActionBar>
    </form>
  );
}
