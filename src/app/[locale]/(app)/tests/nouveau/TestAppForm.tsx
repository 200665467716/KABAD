"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { TextArea, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

type Platform = "ANDROID" | "IOS" | "WEB";
type Question = { q: string; options: string; answer: string };
const PLATFORMS: Platform[] = ["ANDROID", "IOS", "WEB"];
const SLOTS = [5, 8, 10, 20];
const MINUTES = [10, 15, 30];

/** Screen T3: publish a listing. Control questions are optional. */
export function TestAppForm() {
  const t = useTranslations("tests");
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>(["ANDROID"]);
  const [slots, setSlots] = useState(8);
  const [minutes, setMinutes] = useState(15);
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/tests", {
        body: {
          name: String(data.get("name") ?? ""),
          platforms,
          url: String(data.get("url") ?? "").trim(),
          minutes,
          slots,
          pitch: String(data.get("pitch") ?? ""),
          task: String(data.get("task") ?? ""),
          steps: steps.map((s) => s.trim()).filter(Boolean),
          questions: questions
            .filter((q) => q.q.trim())
            .map((q) => {
              const options = q.options
                .split("\n")
                .map((o) => o.trim())
                .filter(Boolean);
              return { q: q.q, answer: q.answer, ...(options.length ? { options } : {}) };
            }),
        },
      });
      router.replace(`/tests/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("form.error") });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);
  const togglePlatform = (p: Platform) => setPlatforms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]));

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back="/tests" close title={t("form.title")} />
      <Page narrow className="flex-1">
        <h2 className="font-display text-2xl font-extrabold uppercase">{t("form.heading")}</h2>
        <TextField id="name" name="name" label={t("form.name")} maxLength={40} error={fieldError("name")} />
        <TextField id="url" name="url" type="url" label={t("form.url")} placeholder="https://" error={fieldError("url")} />
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("form.platforms")}</legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <ToggleChip key={p} pressed={platforms.includes(p)} onClick={() => togglePlatform(p)}>
                {t(`platform.${p}`)}
              </ToggleChip>
            ))}
          </div>
          {fieldError("platforms") && <span className="text-sm font-extrabold text-danger">{fieldError("platforms")}</span>}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("form.slots")}</legend>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((n) => (
              <ToggleChip key={n} pressed={slots === n} onClick={() => setSlots(n)}>
                {n}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("form.minutes")}</legend>
          <div className="flex flex-wrap gap-2">
            {MINUTES.map((n) => (
              <ToggleChip key={n} pressed={minutes === n} onClick={() => setMinutes(n)}>
                {t("minutes", { count: n })}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <TextArea id="pitch" name="pitch" label={t("form.pitch")} rows={3} maxLength={500} hint={t("form.pitchHint")} error={fieldError("pitch")} />
        <TextField id="task" name="task" label={t("form.task")} maxLength={200} placeholder={t("form.taskPlaceholder")} error={fieldError("task")} />

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("form.steps")}</legend>
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <TextField id={`step-${i}`} label={t("form.step", { n: i + 1 })} value={s} maxLength={200} onChange={(e) => setSteps((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} aria-label={t("form.removeStep", { n: i + 1 })} className="grid size-11 place-items-center rounded-full text-muted hover:bg-bg">
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          ))}
          {steps.length < 5 && (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setSteps((x) => [...x, ""])} className="justify-self-start">
              {t("form.addStep")}
            </Button>
          )}
          <p className="text-[13px] text-muted">{t("form.stepsHelp")}</p>
          {fieldError("steps") && <span className="text-sm font-extrabold text-danger">{fieldError("steps")}</span>}
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-extrabold">{t("form.questions")}</legend>
          <p className="text-[13px] text-muted">{t("form.questionsHelp")}</p>
          {questions.map((q, i) => (
            <div key={i} className="grid gap-2 rounded-action border-2 border-line-strong bg-raised p-3">
              <TextField id={`q-${i}`} label={t("form.question", { n: i + 1 })} value={q.q} maxLength={160} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} />
              <TextArea id={`opts-${i}`} label={t("form.options")} rows={3} value={q.options} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, options: e.target.value } : y)))} />
              <TextField id={`ans-${i}`} label={t("form.answer")} value={q.answer} maxLength={60} onChange={(e) => setQuestions((x) => x.map((y, j) => (j === i ? { ...y, answer: e.target.value } : y)))} />
              <Button variant="ghost" size="sm" onClick={() => setQuestions((x) => x.filter((_, j) => j !== i))} className="justify-self-start">
                {t("form.removeQuestion")}
              </Button>
            </div>
          ))}
          {questions.length < 3 && (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setQuestions((x) => [...x, { q: "", options: "", answer: "" }])} className="justify-self-start">
              {t("form.addQuestion")}
            </Button>
          )}
        </fieldset>
        {error && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t("form.submitting") : t("form.submit")}
        </Button>
      </ActionBar>
    </form>
  );
}
