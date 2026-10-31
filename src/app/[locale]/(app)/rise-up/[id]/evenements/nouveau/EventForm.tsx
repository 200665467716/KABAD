"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ActionBar, Page, TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextArea, TextField } from "@/components/ui/Field";
import { ToggleChip } from "@/components/ui/Controls";
import { Alert } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

const DURATIONS = [30, 60, 90, 120];

export function EventForm({ projectId, projectName, others }: { projectId: string; projectName: string; others: number }) {
  const t = useTranslations("rise.newEvent");
  const router = useRouter();
  const [minutes, setMinutes] = useState(60);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const date = String(data.get("date") ?? "");
    const time = String(data.get("time") ?? "");
    // The date and time are typed in the member's own time zone.
    const startsAt = date && time ? new Date(`${date}T${time}`) : null;
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/rise/${projectId}/events`, {
        body: {
          title: String(data.get("title") ?? ""),
          agenda: String(data.get("agenda") ?? ""),
          startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : "",
          minutes,
          meetingUrl: String(data.get("meetingUrl") ?? "").trim(),
          notify,
        },
      });
      router.replace(`/rise-up/${projectId}/evenements/${id}`);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.field : undefined, text: err instanceof ApiError ? err.message : t("error") });
      setBusy(false);
    }
  }
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <TopBar back={`/rise-up/${projectId}`} close title={t("title")} subtitle={projectName} />
      <Page narrow className="flex-1">
        <h2 className="font-display text-2xl font-extrabold uppercase">{t("heading")}</h2>
        <TextField id="title" name="title" label={t("eventTitle")} maxLength={100} error={fieldError("title")} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="date" name="date" type="date" label={t("date")} error={fieldError("startsAt")} />
          <TextField id="time" name="time" type="time" step={900} label={t("time")} />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-extrabold">{t("duration")}</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <ToggleChip key={m} pressed={minutes === m} onClick={() => setMinutes(m)}>
                {t("minutes", { count: m })}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <TextArea id="agenda" name="agenda" label={t("agenda")} rows={3} maxLength={600} placeholder={t("agendaPlaceholder")} error={fieldError("agenda")} />
        <TextField id="meetingUrl" name="meetingUrl" type="url" label={t("url")} placeholder="https://" hint={t("urlHint")} error={fieldError("meetingUrl")} />
        {others > 0 && (
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)}>
            <b>{t("notify", { count: others })}</b>
            <span className="block text-[13px] text-muted">{t("notifyHint")}</span>
          </Checkbox>
        )}
        {error && !["title", "startsAt", "agenda", "meetingUrl"].includes(error.field ?? "") && (
          <Alert tone="danger" role="alert">
            {error.text}
          </Alert>
        )}
      </Page>
      <ActionBar>
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? t("submitting") : t("submit")}
        </Button>
      </ActionBar>
    </form>
  );
}
