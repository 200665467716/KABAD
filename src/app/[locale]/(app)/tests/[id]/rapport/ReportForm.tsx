"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { RadioCard, TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api, ApiError } from "@/lib/api";
import type { TestAppDetail } from "@/lib/domain-types";

type Shot = { file: File; url: string };
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ReportForm({ app: t }: { app: TestAppDetail }) {
  const tr = useTranslations("tests.report");
  const owner = t.owner.name.split(" ")[0];
  const [shots, setShots] = useState<Shot[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [device, setDevice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Local previews are released when the form goes away.
  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), [shots]);

  function addShots(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const bad = files.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) return setError(tr("badFile", { name: bad.name }));
    setError(null);
    setShots((s) => [...s, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, t.steps.length));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (shots.length < t.steps.length) return setError(tr("needShots", { count: t.steps.length }));
    if (t.questions.some((_, i) => !answers[i]?.trim())) return setError(tr("needAnswers"));
    if (!device.trim()) return setError(tr("needDevice"));
    const form = new FormData();
    form.set("report", JSON.stringify({ device, answers: t.questions.map((_, i) => answers[i]), remarks }));
    shots.forEach((s) => form.append("shot", s.file));
    setBusy(true);
    setError(null);
    try {
      await api(`/api/tests/${t.id}/reports`, { body: form });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={`/tests/${t.id}`} close title={tr("title")} subtitle={t.name} />
      <Page narrow className="flex-1">
        {sent ? (
          <Alert tone="success" role="status" title={tr("sentTitle")}>
            {tr("sentBody", { name: owner })}
          </Alert>
        ) : (
          <>
            <section className="grid gap-2" aria-labelledby="shots">
              <div className="flex items-baseline justify-between">
                <h2 id="shots" className="text-sm font-bold">
                  {tr("shots")}
                </h2>
                <span className="text-xs text-muted tabular">
                  {tr("shotsCount", { count: shots.length, total: t.steps.length })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shots.map((s, i) => (
                  <span key={s.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local previews from the member's own files */}
                    <img src={s.url} alt={tr("shotAlt", { n: i + 1 })} className="h-26 w-16 rounded-md border border-line object-cover" />
                    <button type="button" onClick={() => setShots((x) => x.filter((y) => y !== s))} aria-label={tr("removeShot", { n: i + 1 })} className="absolute -top-[18px] -right-[18px] grid size-11 place-items-center">
                      {/* 44 px to tap, a 24 px circle to see. */}
                      <span className="grid size-6 place-items-center rounded-full bg-ink text-bg">
                        <Icon name="close" size={16} />
                      </span>
                    </button>
                  </span>
                ))}
                {shots.length < t.steps.length && (
                  <label className="grid h-26 w-16 cursor-pointer place-items-center content-center gap-1 rounded-md border-[1.5px] border-dashed border-line-strong bg-raised text-center text-[11px] leading-[14px] font-bold text-muted focus-within:outline-2 focus-within:outline-focus">
                    <Icon name="plus" size={18} />
                    {tr("addShot", { n: shots.length + 1 })}
                    <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={addShots} />
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
                <TextField key={q.q} id={`q${i}`} label={`${i + 1}. ${q.q}`} value={answers[i] ?? ""} maxLength={60} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} />
              ),
            )}
            <TextField id="device" label={tr("device")} placeholder={tr("devicePlaceholder")} value={device} maxLength={40} onChange={(e) => setDevice(e.target.value)} />
            <TextArea id="remarks" label={tr("remarks")} rows={4} placeholder={tr("remarksPlaceholder")} value={remarks} maxLength={2000} onChange={(e) => setRemarks(e.target.value)} />
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
            {tr("backToTests")}
          </ButtonLink>
        ) : (
          <>
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? tr("sending") : tr("submit")}
            </Button>
            <p className="text-center text-xs text-muted">{tr("help", { name: owner })}</p>
          </>
        )}
      </ActionBar>
    </form>
  );
}
