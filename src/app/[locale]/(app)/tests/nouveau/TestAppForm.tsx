"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { parseSteps } from "@/lib/test-steps";

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
  const [minutes, setMinutes] = useState(10);
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
          steps: parseSteps(String(data.get("steps") ?? "")),
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
      // "steps.2" is about the steps box.
      setError({ field: err instanceof ApiError ? err.field?.split(".")[0] : undefined, text: err instanceof ApiError ? err.message : t("form.error") });
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
        <TextField id="url" name="url" type="url" label={t("form.url")} placeholder={t("form.urlPlaceholder")} error={fieldError("url")} />
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
        <div className="grid grid-cols-2 gap-2.5">
          <Select id="slots" label={t("form.slots")} value={slots} onChange={(e) => setSlots(Number(e.target.value))}>
            {SLOTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select id="minutes" label={t("form.minutes")} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {MINUTES.map((n) => (
              <option key={n} value={n}>
                {t("minutes", { count: n })}
              </option>
            ))}
          </Select>
        </div>
        {/* T3: one box for the tasks, one per line. A number or a dash typed in front is ignored. */}
        <TextArea id="steps" name="steps" label={t("form.steps")} rows={4} placeholder={t("form.stepsPlaceholder")} hint={t("form.stepsHelp")} error={fieldError("steps")} />
        <TextArea id="pitch" name="pitch" label={t("form.pitch")} rows={3} maxLength={500} hint={t("form.pitchHint")} error={fieldError("pitch")} />
        <TextField id="task" name="task" label={t("form.task")} maxLength={200} placeholder={t("form.taskPlaceholder")} error={fieldError("task")} />

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
        <Alert tone="info">{t("form.groupInfo")}</Alert>
        {/* An error tied to a field is already shown under it. */}
        {error && !["name", "url", "platforms", "steps", "pitch", "task"].includes(error.field ?? "") && (
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
