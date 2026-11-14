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
import { zonedToUtc } from "@/lib/slots";
import { zoneCity } from "@/lib/time-zones";

const DURATIONS = [30, 60, 90, 120];

/** "2026-11-13" and "18:25", read in the member's profile time zone (not the browser's), as the event page shows them. */
function startsAtIn(date: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const h = /^(\d{2}):(\d{2})/.exec(time);
  if (!d || !h) return null;
  return zonedToUtc({ y: Number(d[1]), m: Number(d[2]), d: Number(d[3]) }, Number(h[1]) * 60 + Number(h[2]), timeZone);
}

export function EventForm({ projectId, projectName, others, timeZone }: { projectId: string; projectName: string; others: number; timeZone: string }) {
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
    const startsAt = startsAtIn(date, time, timeZone);
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
          <TextField id="time" name="time" type="time" step={900} label={t("time")} hint={t("timeHint", { city: zoneCity(timeZone) })} />
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
        <TextField id="meetingUrl" name="meetingUrl" type="url" inputMode="url" label={t("url")} placeholder="meet.google.com/abc-defg-hij" hint={t("urlHint")} error={fieldError("meetingUrl")} />
        {others > 0 && (
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)}>
            <b>{t("notify")}</b>
            <span className="block text-[13px] text-muted">{t("notifyHint", { count: others })}</span>
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
